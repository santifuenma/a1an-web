/* ============================================
   A1AN Robot network config
   Update this file manually or run:
   powershell -ExecutionPolicy Bypass -File .\scripts\update_web_robot_ip.ps1
   ============================================ */

window.A1AN_ROBOT_CONFIG = {
  robotIp: 'localhost',
  cameraStreamHost: 'http://localhost:8081',
  rosbridgeUrl: 'ws://localhost:9090'
};
