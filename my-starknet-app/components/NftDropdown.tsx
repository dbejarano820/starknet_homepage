import React, { useState, useMemo, useEffect } from "react";
import { Select, MenuItem, FormControl, InputLabel, Box } from "@mui/material";
import { useContractRead } from "@starknet-react/core";
import { EditNFTModal } from "./EditNftModal";
import { StarknetHomepageNFT } from "./types";
import { STARKNET_HOMEPAGE_ERC721_ADDRESS } from "../constants";
import starknetHomepageABI from "../abi/homepage.json";
import { deserializeTokenObject } from "../utils/deserializeTokenObject";

const NftDropdown = ({ account }: { account: string | undefined }) => {
  const [ownNfts, setOwnNfts] = useState<StarknetHomepageNFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<StarknetHomepageNFT>({
    token_id: 0,
    xpos: 1,
    ypos: 1,
    width: 1,
    height: 1,
    img: "",
    link: "",
  });
  const [modalOpen, setModalOpen] = useState(false);

  const readTx = useMemo(() => {
    const tx = {
      address: STARKNET_HOMEPAGE_ERC721_ADDRESS,
      functionName: "getTokensByOwner",
      abi: starknetHomepageABI,
      args: [account || "0x0000000"],
    };
    return tx;
  }, [account]);

  const { data, isLoading } = useContractRead(readTx);

  useEffect(() => {
    if (!isLoading) {
      const arr = data?.map((nft) => {
        return deserializeTokenObject(nft);
      });
      setOwnNfts(arr || []);
    }
  }, [data, isLoading]);

  const handleNFTSelect = (nft: StarknetHomepageNFT) => {
    setSelectedNFT(nft);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedNFT({
      token_id: 0,
      xpos: 1,
      ypos: 1,
      width: 1,
      height: 1,
      img: "",
      link: "",
    });
    setModalOpen(false);
  };

  return (
    <Box maxWidth="1000px">
      {account ? (
        <FormControl fullWidth>
          <InputLabel id="dropdown">Edit your NFTs</InputLabel>
          <Select
            id="dropdown"
            label="Edit your NFTs"
            value={selectedNFT}
            sx={{ maxWidth: "1000px" }}
            onChange={() => {}}
          >
            <MenuItem value="">
              <em>Select an NFT</em>
            </MenuItem>
            {ownNfts?.map((nft, index) => (
              <MenuItem
                key={index}
                value={nft.token_id}
                onClick={() => handleNFTSelect(nft)}
                sx={{ maxWidth: "1000px" }}
              >
                TokenID {nft.token_id} Origin: {nft.xpos},{nft.ypos} --- Link:{" "}
                {nft.link}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <div></div>
      )}
      <EditNFTModal
        open={modalOpen}
        onClose={handleCloseModal}
        nft={selectedNFT}
      />
    </Box>
  );
};

export default NftDropdown;
