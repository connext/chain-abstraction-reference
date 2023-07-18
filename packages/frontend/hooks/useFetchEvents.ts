import { useEffect, useState } from "react";
import { Hex, Log, parseAbiItem, decodeEventLog, Abi } from "viem";
import { PublicClient } from "wagmi";
import { AbiEvent } from "abitype";

interface FetchEventsOptions {
  publicClient: PublicClient;
  contractAddress: Hex;
  eventSignature: string;
  eventName: string;
  abi: Abi;
  maxBlocksPerCall: number;
  fromBlock: bigint | null;
  toBlock?: bigint;
  setEvents: (events: string[]) => void;
}

function useFetchContractEvents({
  publicClient,
  contractAddress,
  eventSignature,
  eventName,
  abi,
  maxBlocksPerCall,
  fromBlock,
  toBlock,
  setEvents,
}: FetchEventsOptions): {
  isLoadingEvents: boolean;
} {
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);

  useEffect(() => {
    const getContractLogs = async () => {
      if (!fromBlock) {
        return;
      }

      console.log(`Fetching ${eventName} events...`);
      setIsLoadingEvents(true);

      const currentBlock = await publicClient.getBlockNumber();
      const _toBlock = toBlock ?? BigInt(currentBlock);
      let endBlock = BigInt(fromBlock as bigint) + BigInt(maxBlocksPerCall);
      let allEvents: string[] = [];
      const event = parseAbiItem(eventSignature);

      // Get events from earliest to latest
      while (fromBlock <= endBlock && fromBlock <= _toBlock) {
        const logs: Log[] = await publicClient.getLogs({
          address: contractAddress,
          event: event as AbiEvent,
          fromBlock: fromBlock,
          toBlock: endBlock,
        });

        if (logs && logs.length > 0) {
          const logEvents: string[] = logs
            .map((log) => {
              const topics = decodeEventLog({
                abi,
                data: log.data,
                topics: log.topics,
              });
              return topics;
            })
            .filter((topic) => topic.eventName == eventName)
            .flatMap((event) => Object.values(event.args));

          allEvents = [...allEvents, ...logEvents];
        }

        fromBlock = endBlock + BigInt(1);
        endBlock = fromBlock + BigInt(maxBlocksPerCall);
        if (endBlock > _toBlock) {
          endBlock = _toBlock;
        }
      }

      setEvents(allEvents);
      setIsLoadingEvents(false);
    };

    getContractLogs();
  }, [fromBlock]);

  return { isLoadingEvents };
}

export default useFetchContractEvents;
