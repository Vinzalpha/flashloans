require('dotenv').config();

const Web3 = require('web3');
const { ChainId, Token, TokenAmount, Pair } = require('@uniswap/sdk');
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);

const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyber.kyberNetworkProxy
);

const AMOUNT_ETH = 100;
const RECENT_ETH_PRICE = 380; // in USD
const AMOUNT_ETH_WEI = web3.utils.toWei(AMOUNT_ETH.toString());
const AMOUNT_DAI_WEI = web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString());

const init = async () => {
    const [dai, weth] = await Promise.all(
        [addresses.tokens.dai, addresses.tokens.weth].map(tokenAddress => (
            Token.fetchData(
                ChainId.MAINNET,
                tokenAddress
            )
        )));
    const daiWeth = await Pair.fetchData(
        dai,
        weth
    );
    

    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block => {
            console.log(`New block received. Block # ${block.number}`);
            // console.log(block)

            const kyberResults = await Promise.all([
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.dai,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_DAI_WEI
                    )
                    .call(),
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.dai,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_ETH_WEI
                    )
                    .call(), 
            ]);
            console.log(kyberResults);

            const kyberRates = {
                buy: parseFloat(1 / (kyberResults[0].expectedRate / ( 10 ** 18))),
                sell: parseFloat(1 / (kyberResults[1].expectedRate / ( 10 ** 18 ))),
            };
            console.log('Kyber ETH/DAI');
            console.log(kyberRates);

            const uniswapResults = await Promise.all([
                daiWeth.getOutputAmount(new TokenAmount(dai, AMOUNT_DAI_WEI)),
                daiWeth.getOutputAmount(new TokenAmount(weth, AMOUNT_ETH_WEI)),
            ]);
            console.log("uniswapResult", uniswapResults[0][0].toExact())
            console.log("Amount Dai Eth", AMOUNT_DAI_WEI)
            console.log("uniswapResult", uniswapResults[1][0].toExact())
            
            const uniswapRates = {
                buy: parseFloat((AMOUNT_DAI_WEI / uniswapResults[0][0].toExact()) / (10 ** 18)),
                sell: parseFloat((uniswapResults[1][0].toExact() / AMOUNT_ETH)),
            }
            console.log('Uniswap ETH/DAI');
            console.log(uniswapRates);
            
            const gasPrice = await web3.eth.getGasPrice();
            const txCost = 200000 * parseInt(gasPrice);
            const currentEthPrice = (uniswapRates.buy + uniswapRates.sell) / 2;
            const profit1 = (parseInt(AMOUNT_ETH_WEI) / (10 ** 18)) * ((uniswapRates.sell - kyberRates.buy) - (txCost / (10 ** 18)) * currentEthPrice);
            const profit2 = (parseInt(AMOUNT_ETH_WEI) / (10 ** 18)) * ((kyberRates.sell - uniswapRates.buy) - (txCost / (10 ** 18)) * currentEthPrice);

            console.log(parseInt(AMOUNT_ETH_WEI  / (10 ** 18)))
            console.log(currentEthPrice * (txCost  / (10 ** 18)))
            console.log(uniswapRates.sell - kyberRates.buy)
            console.log(kyberRates.sell - uniswapRates.buy)
            console.log(uniswapRates.sell - kyberRates.buy - (txCost / (10 ** 18)) * currentEthPrice)
            console.log(kyberRates.sell - uniswapRates.buy - (txCost / (10 ** 18)) * currentEthPrice)

            if(profit1 > 0) {
                console.log('An opportunity found!');
                console.log(`Buy Eth on Kyber at ${kyberRates.buy} dai`);
                console.log(`Sell Eth on Uniswap at ${uniswapRates.sell} dai`);
                console.log(`Expected profit: ${profit1} dai`);
            }
            if(profit2 > 0) {
                console.log('An opportunity found!');
                console.log(`Buy Eth on Uniswap at ${uniswapRates.buy} dai`);
                console.log(`Sell Eth on Kyber at ${kyberRates.sell} dai`);
                console.log(`Expected profit: ${profit2} dai`);
            }
        })

        .on('error', error => {
            console.log(error);
        })
}
init();