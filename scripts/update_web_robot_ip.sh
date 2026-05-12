#!/usr/bin/env bash
set -euo pipefail

IP=""
ROOT="."
NO_BACKUP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip|-i)
      IP="${2:-}"
      shift 2
      ;;
    --path|-p)
      ROOT="${2:-}"
      shift 2
      ;;
    --no-backup)
      NO_BACKUP=1
      shift
      ;;
    --help|-h)
      cat <<'EOF'
Uso:
  ./scripts/update_web_robot_ip.sh
  ./scripts/update_web_robot_ip.sh --ip 192.168.1.50
  ./scripts/update_web_robot_ip.sh --path /ruta/a/a1an-web

Opciones:
  --ip, -i        IP del PC/robot que ejecuta ROS.
  --path, -p      Ruta al repo web. Por defecto: directorio actual.
  --no-backup     No crea copias .bak de los archivos modificados.
EOF
      exit 0
      ;;
    *)
      echo "Opcion no reconocida: $1"
      exit 1
      ;;
  esac
done

if [[ ! -d "$ROOT" ]]; then
  echo "No existe la ruta: $ROOT"
  exit 1
fi

ROOT="$(cd "$ROOT" && pwd)"
CONFIG_PATH="$ROOT/js/robot-config.js"

get_local_ipv4_addresses() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 addr show scope global 2>/dev/null |
      awk '/inet / { split($2, a, "/"); print a[1] }' |
      grep -Ev '^(127\.|169\.254\.)' |
      sort -u
    return
  fi

  if command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null |
      tr ' ' '\n' |
      grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' |
      grep -Ev '^(127\.|169\.254\.)' |
      sort -u
    return
  fi

  if command -v ifconfig >/dev/null 2>&1; then
    ifconfig 2>/dev/null |
      awk '/inet / { print $2 }' |
      sed 's/^addr://' |
      grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' |
      grep -Ev '^(127\.|169\.254\.)' |
      sort -u
  fi
}

choose_robot_ip() {
  if [[ -n "$IP" ]]; then
    echo "$IP"
    return
  fi

  mapfile -t local_ips < <(get_local_ipv4_addresses || true)

  if [[ "${#local_ips[@]}" -eq 1 ]]; then
    local detected_ip="${local_ips[0]}"
    local answer=""
    read -r -p "IP detectada: $detected_ip. Pulsa Enter para usarla o escribe otra IP: " answer
    if [[ -z "$answer" ]]; then
      echo "$detected_ip"
    else
      echo "$answer"
    fi
    return
  fi

  if [[ "${#local_ips[@]}" -gt 1 ]]; then
    echo "Se han detectado varias IPs:" >&2
    local i=0
    for detected_ip in "${local_ips[@]}"; do
      i=$((i + 1))
      echo " $i. $detected_ip" >&2
    done

    local answer=""
    read -r -p "Elige un numero, pulsa Enter para usar la primera, o escribe otra IP: " answer
    if [[ -z "$answer" ]]; then
      echo "${local_ips[0]}"
    elif [[ "$answer" =~ ^[0-9]+$ ]] && (( answer >= 1 && answer <= ${#local_ips[@]} )); then
      echo "${local_ips[$((answer - 1))]}"
    else
      echo "$answer"
    fi
    return
  fi

  local manual_ip=""
  read -r -p "No se pudo detectar la IP. Introduce la IP del PC/robot que ejecuta ROS (ej: 192.168.1.50): " manual_ip
  echo "$manual_ip"
}

should_skip_path() {
  local file_path="$1"
  case "$file_path" in
    */.git/*|*/node_modules/*|*/dist/*|*/build/*|*/.vercel/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

backup_file() {
  local file_path="$1"
  if [[ "$NO_BACKUP" -eq 0 ]]; then
    cp "$file_path" "$file_path.bak"
  fi
}

ROBOT_IP="$(choose_robot_ip | xargs)"

if [[ -z "$ROBOT_IP" ]]; then
  echo "No se ha introducido ninguna IP. Cancelado."
  exit 1
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "No se encontro js/robot-config.js en: $ROOT"
  exit 1
fi

changed_files=()

tmp_config="$(mktemp)"
sed -E \
  -e "s|robotIp:[[:space:]]*'[^']*'|robotIp: '$ROBOT_IP'|g" \
  -e "s|cameraStreamHost:[[:space:]]*'[^']*'|cameraStreamHost: 'http://$ROBOT_IP:8081'|g" \
  -e "s|rosbridgeUrl:[[:space:]]*'[^']*'|rosbridgeUrl: 'ws://$ROBOT_IP:9090'|g" \
  "$CONFIG_PATH" > "$tmp_config"

if ! cmp -s "$CONFIG_PATH" "$tmp_config"; then
  backup_file "$CONFIG_PATH"
  mv "$tmp_config" "$CONFIG_PATH"
  changed_files+=("$CONFIG_PATH")
else
  rm "$tmp_config"
fi

while IFS= read -r -d '' file_path; do
  if should_skip_path "$file_path" || [[ "$file_path" == "$CONFIG_PATH" ]]; then
    continue
  fi

  case "$file_path" in
    *.js|*.jsx|*.ts|*.tsx|*.html|*.css|*.json|*.env|*.local|*.md|*/.env*)
      ;;
    *)
      continue
      ;;
  esac

  tmp_file="$(mktemp)"
  sed -E \
    -e "s|(localhost|127\.0\.0\.1)(:9090)|$ROBOT_IP\2|g" \
    -e "s|(localhost|127\.0\.0\.1)(:8081)|$ROBOT_IP\2|g" \
    -e "s|IP_DEL_ROBOT_O_PC_ROS|$ROBOT_IP|g" \
    -e "s|IP_DEL_PC_ROS|$ROBOT_IP|g" \
    -e "s|IP_DEL_PC_WEB|$ROBOT_IP|g" \
    "$file_path" > "$tmp_file"

  if ! cmp -s "$file_path" "$tmp_file"; then
    backup_file "$file_path"
    mv "$tmp_file" "$file_path"
    changed_files+=("$file_path")
  else
    rm "$tmp_file"
  fi
done < <(find "$ROOT" -type f -print0)

if [[ "${#changed_files[@]}" -eq 0 ]]; then
  echo "No se encontraron URLs o configuracion para cambiar en: $ROOT"
  exit 0
fi

echo ""
echo "Archivos actualizados con la IP $ROBOT_IP:"
for changed_file in "${changed_files[@]}"; do
  echo " - $changed_file"
done

if [[ "$NO_BACKUP" -eq 0 ]]; then
  echo ""
  echo "Se han creado copias .bak junto a cada archivo modificado."
fi

echo ""
echo "Recuerda probar estos endpoints desde el navegador:"
echo " - ws://$ROBOT_IP:9090"
echo " - http://$ROBOT_IP:8081/stream?topic=/camera/image_raw&type=mjpeg"
echo " - http://$ROBOT_IP:8081/stream?topic=/a1an_vision/debug_image&type=mjpeg"
