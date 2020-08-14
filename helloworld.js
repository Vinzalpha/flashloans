const axios = require('axios');

const init = async () => {
    const queryEthereumPrice = await axios.get(
        'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,CNY,JPY,GBP'
    )
    const ethereumPriceUSD = queryEthereumPrice.data.USD;
    console.log(ethereumPriceUSD);
}
init();