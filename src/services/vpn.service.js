import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

/**
 * Generates a new WireGuard key pair.
 */
export async function generateWgKeys() {
  const { stdout: privateKey } = await exec('wg genkey');
  const { stdout: publicKey } = await exec(`echo "${privateKey.trim()}" | wg pubkey`);
  return {
    privateKey: privateKey.trim(),
    publicKey: publicKey.trim(),
  };
}

/**
 * Assigns a random IP from a /16 subnet.
 * In production, you MUST check if the IP is already in use in your DB.
 */
export function assignIp(subnet) {
  // Assumes subnet is like "10.10.0.0/16"
  const prefix = subnet.split('.')[0] + '.' + subnet.split('.')[1];
  const octet3 = Math.floor(Math.random() * 255);
  const octet4 = Math.floor(Math.random() * 253) + 2; // Avoid .0 and .1
  return `${prefix}.${octet3}.${octet4}`;
}

/**
 * Builds the final client-side .conf file string.
 */
export function buildWgConfig(user, gateway) {
  // Get public IP and port from the gateway's endpoint URL
  const endpointUrl = new URL(gateway.apiEndpoint);
  const publicIp = endpointUrl.hostname;
  
  // Assumes the WG port is 51820 on the agent
  // You could make this a field in the Gateway model too
  const wgPort = 51820; 

  return `
[Interface]
PrivateKey = ${user.wgPrivateKey}
Address = ${user.vpnIp}/32
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${gateway.wgPublicKey}
Endpoint = ${publicIp}:${wgPort}
AllowedIPs = 0.0.0.0/0
`;
}