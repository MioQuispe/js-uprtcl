export const env = {
  pinner: {
    url: 'http://localhost:3000',
    Swarm: [
      '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
      '/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star/',
      '/dns4/webrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star/',
    ],
    Bootstrap: [
      '/ip4/192.168.0.112/tcp/4003/ws/p2p/QmQFEPVjrU6BK3iRYH4U3nbPv2D2CoyfALhft81bTemgJe',
    ],
  },
  ethers: {
    apiKeys: {
      etherscan: '6H4I43M46DJ4IJ9KKR8SFF1MF2TMUQTS2F',
      infura: '73e0929fc849451dae4662585aea9a7b',
    },
  },
};
