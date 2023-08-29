import React, { useState, useMemo } from 'react';
import { Modal, Typography, TextField, Button, CircularProgress,  } from '@mui/material';
import { StarknetHomepageNFT } from './types';
import { useContractWrite } from '@starknet-react/core'

interface NFTModalProps {
    open: boolean;
    onClose: () => void;
    nft: StarknetHomepageNFT;
}


export const EditNFTModal = ({ open, onClose, nft } : NFTModalProps) => {
  const [newLink, setNewLink] = useState('');
  const [newImage, setNewImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const calls = useMemo(() => {
    const tx1 = {   //if newImage is set
        contractAddress: "0x04b61d97c8a8797cb59f44820d34c66fb9404cfc2ceef6b9655461e110e8da97",
        entrypoint: 'setTokenImg',
        calldata: [nft.id, [newImage]]
    };
    const tx2 = { //if newLink is set
      contractAddress: "0x04b61d97c8a8797cb59f44820d34c66fb9404cfc2ceef6b9655461e110e8da97",
      entrypoint: 'setTokenLink',
      calldata: [nft.id, [newLink]]
    }
    return [tx1, tx2];
  }, [nft, newImage]);

  const { writeAsync } = useContractWrite({ calls });

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      await writeAsync();
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error('Error sending transaction:', error);
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{ width: 300, padding: 20, backgroundColor: 'white', borderRadius: 8, textAlign: 'center' }}>
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
        <Button onClick={handleSaveChanges} disabled={isLoading} variant="contained" sx={{marginTop: "8px"}} >
          {isLoading ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};