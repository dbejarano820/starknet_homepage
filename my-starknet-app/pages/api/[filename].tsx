import type { NextApiRequest, NextApiResponse } from 'next'
import { STARKNET_HOMEPAGE_ERC721_ADDRESS } from "../../constants";
import { Provider, Contract, shortString } from "starknet";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { filename } = req.query

  // Ensure filename is defined before extracting the numeric prefix
  if (!filename) {
    res.status(400).end("Invalid filename format");
    return;
  }

  // Extract the numeric prefix from the id string
  const token_id = (filename as string).match(/^\d+/)?.[0];
  
  if (!token_id) {
    res.status(400).end("Invalid filename format");
    return;
  }

  const provider = new Provider({ sequencer: { baseUrl:'https://alpha4.starknet.io'  } });
  
  // Connect the deployed Test contract in Tesnet
  const testAddress = STARKNET_HOMEPAGE_ERC721_ADDRESS;
  
  // read abi of Test contract
  const { abi: testAbi } = await provider.getClassAt(testAddress);
  if (testAbi === undefined) { throw new Error("no abi.") };
  const myTestContract = new Contract(testAbi, testAddress, provider);
  
  // Interaction with the contract with call
  const img = (await myTestContract.getTokenImg({low: token_id, high: 0})).map(shortString.decodeShortString).join("");
  const url = (await myTestContract.getTokenLink({low: token_id, high: 0})).map(shortString.decodeShortString).join("");
  const tokenAttributes = (await myTestContract.getTokenAttributes({low: token_id, high: 0}));
  res.end(JSON.stringify({
    name: "Starknet Homepage",
    description: "A piece of Starknet Homepage located at pos["+tokenAttributes[0]+","+tokenAttributes[1]+"]",
    image: img,
    external_url: url
  }));
}