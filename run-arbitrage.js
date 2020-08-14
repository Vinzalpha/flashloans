// voir : https://api.kyber.network/currencies
require('dotenv').config();
const axios = require('axios');
const Web3 = require('web3');
const { ChainId, Token, TokenAmount, Pair } = require('@uniswap/sdk');
const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');
const Flashloan = require('./build/contracts/Flashloan.json');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

const kyber = new web3.eth.Contract(
    abis.kyber.kyberNetworkProxy,
    addresses.kyber.kyberNetworkProxy
);

const DIRECTION = {
    KYBER_TO_UNISWAP: 0,
    UNISWAP_TO_KYBER: 1
  };

const init = async () => {
    // GET ETHEREUM PRICE
    const AMOUNT_ETH = 100;
    const queryEthereumPrice = await axios.get(
        'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,CNY,JPY,GBP'
    )
    const RECENT_ETH_PRICE = queryEthereumPrice.data.USD; // in USD
    const AMOUNT_ETH_WEI = web3.utils.toBN(web3.utils.toWei(AMOUNT_ETH.toString()));
    const AMOUNT_DAI_WEI = web3.utils.toBN(web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString()));
    const AMOUNT_USDC_WEI = web3.utils.toBN(web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString(), 'mwei'));
    const AMOUNT_USDT_WEI = web3.utils.toBN(web3.utils.toWei((AMOUNT_ETH * RECENT_ETH_PRICE).toString(), 'mwei'));
    const ONE_WEI = web3.utils.toBN(web3.utils.toWei('1'));

    // const networkId = await WebGL2RenderingContext.eth.net.getId();
    // const flashloan = new WebGL2RenderingContext.eth.Contract(
    //     Flashloan.abi,
    //     Flashloan.networks[networkId].address
    // );

    // UNISWAP PAIR
    const [dai, weth, usdc, usdt] = await Promise.all(
        [addresses.tokens.dai, addresses.tokens.weth, addresses.tokens.usdc, addresses.tokens.usdt].map(tokenAddress => (
            Token.fetchData(
                ChainId.MAINNET,
                tokenAddress
            )
        )));
    const daiWeth = await Pair.fetchData(
        dai,
        weth,
    );
    const usdcWeth = await Pair.fetchData(
        usdc,
        weth,
    );
    const usdtWeth = await Pair.fetchData(
        usdt,
        weth,
    );
    
    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block => {
            console.log(`New block received. Block # ${block.number}`);
            // console.log(block)

            const amountsEth = await Promise.all([
                // DAI
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.dai,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_DAI_WEI
                    )
                    .call(),
                daiWeth.getOutputAmount(new TokenAmount(dai, AMOUNT_DAI_WEI)),
                // USDC
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.usdc,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_USDC_WEI
                    )
                    .call(),
                usdcWeth.getOutputAmount(new TokenAmount(usdc, AMOUNT_USDC_WEI)),
                // USDT
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.usdt,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_USDT_WEI
                    )
                    .call(),
                usdtWeth.getOutputAmount(new TokenAmount(usdt, AMOUNT_USDT_WEI)),
            ]);
            const ethFromKyberSellDai = AMOUNT_DAI_WEI.mul(web3.utils.toBN(amountsEth[0].expectedRate)).div(ONE_WEI);
            const ethFromUniswapSellDai = web3.utils.toBN(amountsEth[1][0].raw.toString());
            const ethFromKyberSellUsdc = web3.utils.toBN(web3.utils.toWei(AMOUNT_USDC_WEI.toString(), 'microether')).mul(web3.utils.toBN(amountsEth[2].expectedRate)).div(ONE_WEI);
            const ethFromUniswapSellUsdc = web3.utils.toBN(amountsEth[3][0].raw.toString());
            const ethFromKyberSellUsdt = web3.utils.toBN(web3.utils.toWei(AMOUNT_USDT_WEI.toString(), 'microether')).mul(web3.utils.toBN(amountsEth[4].expectedRate)).div(ONE_WEI);
            const ethFromUniswapSellUsdt = web3.utils.toBN(amountsEth[5][0].raw.toString());
            
            const amountsDai = await Promise.all([
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
                        addresses.tokens.dai, 
                        ethFromUniswapSellDai.toString()
                    ) 
                    .call(),
                daiWeth.getOutputAmount(new TokenAmount(weth, ethFromKyberSellDai.toString())),
            ]);
            const daiFromKyber = ethFromUniswapSellDai.mul(web3.utils.toBN(amountsDai[0].expectedRate)).div(ONE_WEI);
            const daiFromUniswap = web3.utils.toBN(amountsDai[1][0].raw.toString());
        
            console.log(`Kyber -> Uniswap. Dai input / output: ${web3.utils.fromWei(AMOUNT_DAI_WEI.toString())} DAI / ${web3.utils.fromWei(daiFromUniswap.toString())} DAI`);
            console.log(`Uniswap -> Kyber. Dai input / output: ${web3.utils.fromWei(AMOUNT_DAI_WEI.toString())} DAI / ${web3.utils.fromWei(daiFromKyber.toString())} DAI`);
        
            const amountsUsdc = await Promise.all([
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
                        addresses.tokens.usdc, 
                        ethFromUniswapSellUsdc.toString()
                    ) 
                    .call(),
                usdcWeth.getOutputAmount(new TokenAmount(weth, ethFromKyberSellUsdc.toString())),
            ]);
            const usdcFromKyber = ethFromUniswapSellUsdc.mul(web3.utils.toBN(amountsUsdc[0].expectedRate)).div(ONE_WEI);
            const usdcFromUniswap = web3.utils.toBN(amountsUsdc[1][0].raw.toString());
        
            console.log(`Kyber -> Uniswap. Usdc input / output: ${web3.utils.fromWei(AMOUNT_USDC_WEI.toString(), 'picoether')} USDC / ${web3.utils.fromWei(usdcFromUniswap.toString(), 'picoether')} USDC`);
            console.log(`Uniswap -> Kyber. Usdc input / output: ${web3.utils.fromWei(AMOUNT_USDC_WEI.toString(), 'picoether')} USDC / ${web3.utils.fromWei(usdcFromKyber.toString())} USDC`);
        
            const amountsUsdt = await Promise.all([
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
                        addresses.tokens.usdt, 
                        ethFromUniswapSellUsdt.toString()
                    ) 
                    .call(),
                usdtWeth.getOutputAmount(new TokenAmount(weth, ethFromKyberSellUsdt.toString())),
            ]);
            const usdtFromKyber = ethFromUniswapSellUsdt.mul(web3.utils.toBN(amountsUsdt[0].expectedRate)).div(ONE_WEI);
            const usdtFromUniswap = web3.utils.toBN(amountsUsdt[1][0].raw.toString());
        
            console.log(`Kyber -> Uniswap. Usdt input / output: ${web3.utils.fromWei(AMOUNT_USDT_WEI.toString(), 'picoether')} USDT / ${web3.utils.fromWei(usdtFromUniswap.toString(), 'picoether')} USDT`);
            console.log(`Uniswap -> Kyber. Usdt input / output: ${web3.utils.fromWei(AMOUNT_USDT_WEI.toString(), 'picoether')} USDT / ${web3.utils.fromWei(usdtFromKyber.toString())} USDT`);
        



            const kyberResults = await Promise.all([
                // Buy ETH sell DAI
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.dai,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_DAI_WEI
                    )
                    .call(),
                // Sell ETH buy DAI
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        addresses.tokens.dai,
                        AMOUNT_ETH_WEI
                    )
                    .call(), 
                // Buy ETH sell USDC
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.usdc,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_USDC_WEI
                    )
                    .call(),
                // Sell ETH buy USDC
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        addresses.tokens.usdc,
                        AMOUNT_ETH_WEI
                    )
                    .call(),
                // Buy ETH sell USDT
                kyber
                    .methods
                    .getExpectedRate(
                        addresses.tokens.usdc,
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        AMOUNT_USDT_WEI
                    )
                    .call(),
                // Sell ETH buy USDT
                kyber
                    .methods
                    .getExpectedRate(
                        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                        addresses.tokens.usdt,
                        AMOUNT_ETH_WEI
                    )
                    .call(),  
            ]);
            // console.log("kyberResults", kyberResults);
            console.log(web3.utils.fromWei(kyberResults[2].expectedRate, 'Ether'));

            const kyberRates = {
                buy: parseFloat(1 / (kyberResults[0].expectedRate / ( 10 ** 18))),
                sell: parseFloat(kyberResults[1].expectedRate / (10 ** 18)),
            };
            console.log('Kyber ETH/DAI');
            console.log("kyberRates", kyberRates);

            const kyberRatesETHUSDC = {
                buy: parseFloat(1 / (kyberResults[2].expectedRate / ( 10 ** 18))),
                sell: parseFloat(kyberResults[3].expectedRate / (10 ** 18)),
            };
            console.log('Kyber ETH/USDC');
            console.log(kyberRatesETHUSDC);

            const kyberRatesETHUSDT = {
                buy: parseFloat(1 / (kyberResults[4].expectedRate / ( 10 ** 18))),
                sell: parseFloat(kyberResults[5].expectedRate / (10 ** 18)),
            };
            console.log('Kyber ETH/USDT');
            console.log(kyberRatesETHUSDT);


            // UNISWAP
            const uniswapResults = await Promise.all([
                daiWeth.getOutputAmount(new TokenAmount(dai, AMOUNT_DAI_WEI)),
                daiWeth.getOutputAmount(new TokenAmount(weth, AMOUNT_ETH_WEI)),
            ]);
            console.log("uniswapResult", uniswapResults[0][0].toExact())
            // console.log("Amount Dai Eth", AMOUNT_DAI_WEI)
            console.log("uniswapResult", uniswapResults[1][0].toExact())
            
            const uniswapRates = {
                buy: parseFloat( AMOUNT_DAI_WEI / (uniswapResults[0][0].toExact() * 10 ** 18)),
                sell: parseFloat( uniswapResults[1][0].toExact() / AMOUNT_ETH ),
            }
            console.log('Uniswap ETH/DAI');
            console.log(uniswapRates);

            const uniswapResultsUSDC = await Promise.all([
                usdcWeth.getOutputAmount(new TokenAmount(usdc, AMOUNT_USDC_WEI)),
                usdcWeth.getOutputAmount(new TokenAmount(weth, AMOUNT_ETH_WEI)),
            ]);
            // console.log("uniswapResult", uniswapResultsUSDC[0][0].toExact())
            // console.log("Amount USDC Eth", AMOUNT_USDC_WEI)
            // console.log("uniswapResult", uniswapResultsUSDC[1][0].toExact())
            
            const uniswapRatesUSDC = {
                buy: parseFloat( AMOUNT_USDC_WEI / (uniswapResultsUSDC[0][0].toExact() * 10 ** 6)),
                sell: parseFloat( uniswapResultsUSDC[1][0].toExact() / AMOUNT_ETH ),
            }
            console.log('Uniswap ETH/USDC');
            console.log(uniswapRatesUSDC);


            const uniswapResultsUSDT = await Promise.all([
                usdtWeth.getOutputAmount(new TokenAmount(usdt, AMOUNT_USDT_WEI)),
                usdtWeth.getOutputAmount(new TokenAmount(weth, AMOUNT_ETH_WEI)),
            ]);
            // console.log("uniswapResult", uniswapResultsUSDT[0][0].toExact())
            // console.log("Amount USDT Eth", AMOUNT_USDT_WEI)
            // console.log("uniswapResult", uniswapResultsUSDT[1][0].toExact())
            
            const uniswapRatesUSDT = {
                buy: parseFloat( AMOUNT_USDT_WEI / (uniswapResultsUSDT[0][0].toExact() * 10 ** 6)),
                sell: parseFloat( uniswapResultsUSDT[1][0].toExact() / AMOUNT_ETH ),
            }
            console.log('Uniswap ETH/USDT');
            console.log(uniswapRatesUSDT);

            // const [tx1, tx2] = Object.keyx(DIRECTION).map(direction => flashloan.methods.initiateFlashloan(
            //     addresses.dydx.solo,
            //     addresses.tokens.dai,
            //     AMOUNT_DAI_WEI,
            //     DIRECTION[direction]
            // ));
            // const [gasPrice, gasCost1, gasCost2] = await Promise.all([
            //     web3.eth.getGasPrice(),
            //     tx1.estimateGas({from: admin }),
            //     tx2.estimateGas({from: admin }),
            // ]);
            // console.log(gasCost1);


            const gasPrice = await web3.eth.getGasPrice();
            const txCost = 200000 * parseInt(gasPrice);
            // const txCost1 = parseInt(gasCost1) * parseInt(gasPrice);
            // const txCost2 = parseInt(gasCost2) * parseInt(gasPrice);
            const currentEthPrice = (uniswapRates.buy + uniswapRates.sell) / 2;
            const profit1 = (parseInt(AMOUNT_ETH_WEI) / (10 ** 18)) * ((uniswapRates.sell - kyberRates.buy) - (txCost / (10 ** 18)) * currentEthPrice);
            // const profit1 = (parseInt(AMOUNT_ETH_WEI) / (10 ** 18)) * ((uniswapRates.sell - kyberRates.buy) - (txCost1 / (10 ** 18)) * currentEthPrice);
            const profit2 = (parseInt(AMOUNT_ETH_WEI) / (10 ** 18)) * ((kyberRates.sell - uniswapRates.buy) - (txCost / (10 ** 18)) * currentEthPrice);
            // const profit2 = (parseInt(AMOUNT_ETH_WEI) / (10 ** 18)) * ((kyberRates.sell - uniswapRates.buy) - (txCost2 / (10 ** 18)) * currentEthPrice);

            console.log("Nombre de ETH", parseInt(AMOUNT_ETH_WEI  / (10 ** 18)))
            console.log("Fee transaction", txCost);
            console.log("Prix du gas en $", currentEthPrice * (txCost  / (10 ** 18)))
            console.log(uniswapRates.sell - kyberRates.buy)
            console.log(kyberRates.sell - uniswapRates.buy)
            console.log(uniswapRates.sell - kyberRates.buy - (txCost / (10 ** 18)) * currentEthPrice)
            console.log(kyberRates.sell - uniswapRates.buy - (txCost / (10 ** 18)) * currentEthPrice)
            console.log("profit1", profit1);
            console.log("profit2", profit2);

            if(profit1 > 0) {
                console.log('An opportunity found!');
                console.log(`Buy Eth on Kyber at ${kyberRates.buy} dai`);
                console.log(`Sell Eth on Uniswap at ${uniswapRates.sell} dai`);
                console.log(`Expected profit: ${profit1} dai`);
                // const data = tx1.encodeABI();
                // const txData = {
                //     from: admin,
                //     to: flashloan.options.address,
                //     data,
                //     gas: gasCost1,
                //     gasPrice
                // };
                // const receipt = await web3.eth.sendTransaction(txData);
                // console.log(`Transaction hash: ${receipt.transactionHash}`)
            }
            else if(profit2 > 0) {
                console.log('An opportunity found!');
                console.log(`Buy Eth on Uniswap at ${uniswapRates.buy} dai`);
                console.log(`Sell Eth on Kyber at ${kyberRates.sell} dai`);
                console.log(`Expected profit: ${profit2} dai`);
                // const data = tx2.encodeABI();
                // const txData = {
                //     from: admin,
                //     to: flashloan.options.address,
                //     data,
                //     gas: gasCost2,
                //     gasPrice
                // };
                // const receipt = await web3.eth.sendTransaction(txData);
                // console.log(`Transaction hash: ${receipt.transactionHash}`)
            }
        })

        .on('error', error => {
            console.log(error);
        });
}
init();