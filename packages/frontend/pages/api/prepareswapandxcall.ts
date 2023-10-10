import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { prepareSwapAndXCall } from "@connext/chain-abstraction";

const cors = Cors({
  methods: ["POST", "GET", "HEAD"],
});

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
}

export default async function prepareSwapAndXCallAPIHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await runMiddleware(req, res, cors);
    const txRequest = await prepareSwapAndXCall(
      req.body.swapAndXCallParams,
      req.body.signerAddress,
      { apiKey: "f5GTHProMkymbSTfaeRSJQXZxrpngQwK" },
    );
    res.status(200).send(txRequest);
  } catch (err) {
    res.status(400).send({ message: "Failed" });
  }
}
