const axios = require('axios');

export const queryEthereumPrice = () => {
    try{
        axios
            .get(
                'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,CNY,JPY,GBP'
                // 'https://api.coindesk.com/v1/bpi/currentprice.json'
            )
            .then(response => {
                return response.data;
            })
    } catch(error){
        return error;
    }
}
