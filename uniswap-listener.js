require('dotenv').config();
const Web3 = require('web3');

const { mainnet: addresses } = require('./addresses/index');
const { ChainId, Fetcher, WETH, TokenAmount } = require('@uniswap/sdk');
// const { ChainId, Fetcher, WETH, Trade, Token, Pair, TokenAmount, TradeType, Route, Percent } = require('@uniswap/sdk')

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);


const chainId = ChainId.MAINNET;
// const daiAddress = addresses.tokens2.dai.address;
// const daiDecimals = addresses.tokens2.dai.decimals;
// const wethAddress = addresses.tokens2.weth.address;
// const wethDecimals = addresses.tokens2.weth.decimals;



const init = async () => {
    // init datas





    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block => {
            console.log(`New block received. Block # ${block.number}`);

            // UNISWAP 
            const weth = WETH[chainId];
            const [dai, usdc, usdt] = await Promise.all(
                [addresses.tokens.dai, addresses.tokens.usdc, addresses.tokens.usdt].map(token => (
                    Fetcher.fetchTokenData(
                        ChainId.MAINNET,
                        token.address
                    )
                )));
            const daiWeth = await Fetcher.fetchPairData(
                dai,
                weth,
            );
            const wethDai = await Fetcher.fetchPairData(
                weth,
                dai,
            );
            const usdcWeth = await Fetcher.fetchPairData(
                usdc,
                weth,
            );
            const usdtWeth = await Fetcher.fetchPairData(
                usdt,
                weth,
            );

            // Playable parameters
            const daiAmount = 413;
            const usdcAmount = 413;
            const usdtAmount = 413;

            const usdcDecimals = addresses.tokens.usdc.decimals;
            const usdtDecimals = addresses.tokens.usdt.decimals;

            const daiAmountInWei = web3.utils.toWei(daiAmount.toString());
            const usdcAmountInDecimals = usdcAmount * 10 ** usdcDecimals;
            const usdtAmountInDecimals = usdtAmount * 10 ** usdtDecimals;

            // TEST 0 : DAI => WETH => DAI
            console.log('=================== TEST 0 : DAI => WETH => DAI ===================');
            const getPriceDaiToWeth = daiWeth.getOutputAmount(new TokenAmount(dai, daiAmountInWei));
            const fromDaiToWethAmount = getPriceDaiToWeth[0].raw.toString();
            console.log(`Sell ${daiAmount} Dai to receive ${web3.utils.fromWei(fromDaiToWethAmount)} WETH`);

            const getPriceWethToDai = wethDai.getOutputAmount(new TokenAmount(weth, fromDaiToWethAmount));
            const fromWethToDaiAmount = getPriceWethToDai[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromDaiToWethAmount)} WETH to receive ${web3.utils.fromWei(fromWethToDaiAmount)} DAI`);

            // TEST 1 : USDC to WETH to USDT
            console.log('=================== TEST 1 : USDC to WETH to USDT ===================');
            const getPriceUsdcToWeth = usdcWeth.getOutputAmount(new TokenAmount(usdc, usdcAmountInDecimals));
            const fromUsdcToWethAmount = getPriceUsdcToWeth[0].raw.toString();
            console.log(`Sell ${usdcAmount} USDC to receive ${web3.utils.fromWei(fromUsdcToWethAmount)} WETH`);

            const getPriceWethToUsdt = usdtWeth.getOutputAmount(new TokenAmount(weth, fromUsdcToWethAmount));
            const fromWethToUsdtAmount = getPriceWethToUsdt[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromUsdcToWethAmount)} WETH to receive ${fromWethToUsdtAmount / (10 ** usdtDecimals)} USDT`)


            // Test 2 : USDT => WETH => USDC
            console.log('=================== Test 2 : USDT => WETH => USDC ===================');
            const getPriceUsdtToWeth = usdtWeth.getOutputAmount(new TokenAmount(usdt, usdtAmountInDecimals));
            const fromUsdtToWethAmount = getPriceUsdtToWeth[0].raw.toString();
            console.log(`Sell ${usdtAmount} USDT to receive ${web3.utils.fromWei(fromUsdtToWethAmount)} WETH`);

            const getPriceWethToUsdc = usdcWeth.getOutputAmount(new TokenAmount(weth, fromUsdtToWethAmount));
            const fromWethToUsdcAmount = getPriceWethToUsdc[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromUsdtToWethAmount)} WETH to receive ${fromWethToUsdcAmount / (10 ** usdtDecimals)} USDC`);

            // Test 3 : DAI => WETH => USDC
            console.log('=================== Test 3 : DAI => WETH => USDC ===================');
            // const getPriceDaiToWeth = usdtWeth.getOutputAmount(new TokenAmount(usdt, usdtAmountInDecimals));
            // const fromDaiToWethAmount = getPriceUsdtToWeth[0].raw.toString();
            console.log(`Sell ${daiAmount} Dai to receive ${web3.utils.fromWei(fromDaiToWethAmount)} WETH`);

            const getPriceWethToUsdc_2 = usdcWeth.getOutputAmount(new TokenAmount(weth, fromDaiToWethAmount));
            const fromWethToUsdcAmount_2 = getPriceWethToUsdc_2[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromDaiToWethAmount)} WETH to receive ${fromWethToUsdcAmount_2 / (10 ** usdtDecimals)} USDC`);

            // Test 4 : USDC => WETH => DAI
            console.log('=================== Test 4 : USDC => WETH => DAI ===================');
            // const getPriceUsdcToWeth = usdcWeth.getOutputAmount(new TokenAmount(usdc, usdcAmountInDecimals));
            // const fromUsdcToWethAmount = getPriceUsdcToWeth[0].raw.toString();
            console.log(`Sell ${usdcAmount} USDC to receive ${web3.utils.fromWei(fromUsdcToWethAmount)} WETH`);

            const getPriceWethToDai_2 = daiWeth.getOutputAmount(new TokenAmount(weth, fromUsdcToWethAmount));
            const fromWethToDaiAmount_2 = getPriceWethToDai_2[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromUsdcToWethAmount)} WETH to receive ${web3.utils.fromWei(fromWethToDaiAmount_2)} DAI`);

            // Test 5 : DAI => WETH => USDT
            console.log('=================== Test 5 : DAI => WETH => USDT ===================');
            // const getPriceDaiToWeth = daiWeth.getOutputAmount(new TokenAmount(dai, daiAmountInDecimals));
            // const fromdaiToWethAmount = getPricedaiToWeth[0].raw.toString();
            console.log(`Sell ${daiAmount} DAI to receive ${web3.utils.fromWei(fromDaiToWethAmount)} ETH`);

            const getPriceWethToUsdt_2 = usdtWeth.getOutputAmount(new TokenAmount(weth, fromDaiToWethAmount));
            const fromWethToUsdtAmount_2 = getPriceWethToUsdt_2[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromDaiToWethAmount)} ETH to receive ${fromWethToUsdtAmount_2 / (10 ** usdtDecimals)} USDT`);

            // Test 6 : USDT => WETH => DAI
            console.log('=================== Test 6 : USDT => WETH => DAI ===================');
            // const getPriceUsdtToWeth = usdtWeth.getOutputAmount(new TokenAmount(usdt, usdtAmountInDecimals));
            // const fromUsdtToWethAmount = getPriceUsdtToWeth[0].raw.toString();
            console.log(`Sell ${usdtAmount} USDT to receive ${web3.utils.fromWei(fromUsdtToWethAmount)} WETH`);

            const getPriceWethToDai_3 = daiWeth.getOutputAmount(new TokenAmount(weth, fromUsdtToWethAmount));
            const fromWethToDaiAmount_3 = getPriceWethToDai_3[0].raw.toString();
            console.log(`Sell ${web3.utils.fromWei(fromUsdtToWethAmount)} ETH to receive ${web3.utils.fromWei(fromWethToDaiAmount_3)} DAI`);

        })


}
init();