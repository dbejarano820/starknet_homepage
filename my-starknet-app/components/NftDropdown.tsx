import React, { useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { EditNFTModal } from './EditNftModal';
import { StarknetHomepageNFT } from './types';
import { nftsMock } from '../mocks/nfts';

const NftDropdown = () => {
  const nfts = nftsMock; //replace with hook calling getByOwner

  const [selectedNFT, setSelectedNFT] = useState<StarknetHomepageNFT>({
    id: 0,
    xpos: 1,
    ypos: 1,
    width: 1,
    height: 1,
    img: '',
    link: '',
  });
  const [modalOpen, setModalOpen] = useState(false);

  const handleNFTSelect = (nft: StarknetHomepageNFT) => {
    setSelectedNFT(nft);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedNFT({
      id: 0,
      xpos: 1,
      ypos: 1,
      width: 1,
      height: 1,
      img: '',
      link: '',
    });
    setModalOpen(false);
  };

  return (
    <div>
      <FormControl fullWidth >
        <InputLabel id="dropdown">Edit your NFTs</InputLabel>
        <Select  id="dropdown" label="Edit your NFTs" value={selectedNFT} onChange={() => {}}>
          <MenuItem value="">
            <em>Select an NFT</em>
          </MenuItem>
          {nfts.map((nft, index) => (
            <MenuItem key={index} value={nft.id} onClick={() => handleNFTSelect(nft)}>
              {nft.img}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <EditNFTModal open={modalOpen} onClose={handleCloseModal} nft={selectedNFT} />
    </div>
  );
};

export default NftDropdown;
