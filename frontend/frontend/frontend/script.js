const connect = document.getElementById('connect');
const status = document.getElementById('status');
connect.onclick = async () => {
  if (window.ethereum) {
    try {
      await ethereum.request({ method: 'eth_requestAccounts' });
      const chain = await ethereum.request({ method: 'eth_chainId' });
      if (chain !== '0x61') status.innerText = 'Please switch to BSC Testnet';
      else status.innerText = 'Connected to BSC Testnet ✅';
    } catch (err) {
      status.innerText = 'Connection failed';
    }
  } else status.innerText = 'Install MetaMask first';
};
