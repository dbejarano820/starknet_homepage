import React, { useState, useMemo } from "react";
import {
  Modal,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import { StarknetHomepageNFT } from "./types";
import { useContractWrite } from "@starknet-react/core";
import { shortString } from "starknet";
import { STARKNET_HOMEPAGE_ERC721_ADDRESS } from "../constants";

interface NFTModalProps {
  open: boolean;
  onClose: () => void;
  nft: StarknetHomepageNFT;
}

export const EditNFTModal = ({ open, onClose, nft }: NFTModalProps) => {
  const [newLink, setNewLink] = useState("");
  const [newImage, setNewImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const calls = useMemo(() => {
    const txs = [];
    const splitNewImage: string[] = shortString.splitLongString(newImage);
    const splitNewLink: string[] = shortString.splitLongString(newLink);

    if (newImage !== "" && nft) {
      const tx1 = {
        contractAddress: STARKNET_HOMEPAGE_ERC721_ADDRESS,
        entrypoint: "setTokenImg",
        calldata: [nft.token_id, 0, splitNewImage],
      };
      txs.push(tx1);
    }

    if (newLink !== "" && nft) {
      const tx2 = {
        contractAddress: STARKNET_HOMEPAGE_ERC721_ADDRESS,
        entrypoint: "setTokenLink",
        calldata: [nft.token_id, 0, splitNewLink],
      };
      txs.push(tx2);
    }

    return txs;
  }, [nft, newImage, newLink]);

  const { writeAsync } = useContractWrite({ calls });

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      await writeAsync();
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error("Error sending transaction:", error);
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 300,
          padding: 20,
          backgroundColor: "white",
          borderRadius: 8,
          textAlign: "center",
        }}
      >
        <Typography variant="h6">Edit SHP</Typography>
        <TextField
          label={nft.link}
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label={nft.img}
          value={newImage}
          onChange={(e) => setNewImage(e.target.value)}
          fullWidth
          margin="normal"
        />
        <Button
          onClick={handleSaveChanges}
          disabled={isLoading}
          variant="contained"
          sx={{ marginTop: "8px" }}
        >
          {isLoading ? <CircularProgress size={24} /> : "Save Changes"}
        </Button>
      </div>
    </Modal>
  );
};
