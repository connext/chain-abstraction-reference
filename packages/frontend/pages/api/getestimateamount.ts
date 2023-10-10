import type { NextApiRequest, NextApiResponse } from "next";
import Cors from "cors";
import { getEstimateAmountReceived } from "@connext/chain-abstraction";
import { EstimateQuoteAmountArgs } from "@connext/chain-abstraction/dist/types";

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

export default async function getEstimateAmountReceivedApiHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await runMiddleware(req, res, cors);
    const params = {
      ...req.query,
      config: { apiKey: "f5GTHProMkymbSTfaeRSJQXZxrpngQwK" },
    };
    const estimateAmount = await getEstimateAmountReceived(
      params as EstimateQuoteAmountArgs,
    );
    res.status(200).send(estimateAmount);
  } catch (err) {
    res.status(400).send({ message: "Failed" });
  }
}
