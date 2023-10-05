const express = require("express")

const cors = require('cors')

const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 8080

const app = next({ dev, hostname, port })

const {prepareSwapAndXCall, getEstimateAmountReceived} = require("@connext/chain-abstraction")




app.prepare().then(() => {
    const server = express();

    server.use(cors());

    server.get('/prepareSwapAndXcall', async(req, res)  => {
        const {swapAndXCallParams, signerAddress} = req.query;
        const txRequest = await prepareSwapAndXCall(swapAndXCallParams, signerAddress, {apiKey:"f5GTHProMkymbSTfaeRSJQXZxrpngQwK"})
        res.status(200).send(txRequest)
    })

    server.get('/getEstimateAmountReceived', async(req, res) => {
        const params = {...req.query, config: {apiKey:"f5GTHProMkymbSTfaeRSJQXZxrpngQwK"}}
        const estimateAmount = await getEstimateAmountReceived(params)
        res.status(200).send(estimateAmount)
    })

    server.listen(8080, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:8080');
    });
});