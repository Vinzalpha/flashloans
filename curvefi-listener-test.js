require('dotenv').config();
const Web3 = require('web3');

const abis = require('./abis');
const { mainnet: addresses } = require('./addresses');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.INFURA_URL)
);
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);

// https://github.com/curvefi/curve-vue/blob/master/src/docs/README.md#how-to-integrate-curve-smart-contracts
const curvefi = new web3.eth.Contract(
    abis.curvefi.curvefiNetwork,
    addresses.curvefi.ySwap
);

const curvefi_usdt = new web3.eth.Contract(
    abis.curvefi_usdt.curvefi_usdt_network,
    addresses.curvefi.swapUsdtPool,
)

const init = async () => {
    web3.eth.subscribe('newBlockHeaders')
        .on('data', async block => {
            console.log(`New block received. Block # ${block.number}`);

            const test = await Promise.all([
                curvefi
                    .methods
                    .coins(2)
                    .call(),
            ]);
            console.log(test);
            
            console.log("DAI", addresses.tokens.dai.address)
            console.log("USDC", addresses.tokens.usdc.address)
            console.log("USDT", addresses.tokens.usdt.address)
            
            // underlying_coins(0) => DAI address
            // underlying_coins(1) => USDC address
            const test2 = await Promise.all([
                curvefi
                    .methods
                    .underlying_coins(1)
                    .call()
            ]);
            console.log(test2)

            const test3 = await Promise.all([
                curvefi_usdt
                    .methods
                    .underlying_coins(2)
                    .call(),
            ]);
            console.log("curvefi_usdt", test3);
            // ON A BIEN USDT DANS CURVEFI_USDT !!!!
            // see: https://github.com/curvefi/curve-contract/tree/pool_usdt/deployed/2020-04-08.%20New%20deposit%20zap

            // Poll price
            const daiAmount = 10;
            // const daiAmountWei = ethers.utils.parseUnits(
            //     daiAmount.toString(),
            //     addresses.tokens.dai.decimals
            // );
            const daiAmountWei = web3.utils.toBN(daiAmount * 10 ** addresses.tokens.dai.decimals);
            const daiUsdc = await Promise.all([
                curvefi
                    .methods
                    .get_dy_underlying(0, 2, daiAmountWei)
                    .call(),
            ]);
            console.log("daiUsdc", daiUsdc / (10 ** 6));
        })
}
init();