import React, { useState, useMemo, useEffect } from 'react';
import { useContractWrite, useContractRead } from '@starknet-react/core';
import { shortString } from "starknet";
import { CircularProgress, TextField, Grid, Typography, Box, Modal, Button } from '@mui/material';
import { ERC_20_ADDRESS, STARKNET_HOMEPAGE_ERC721_ADDRESS } from '../constants';
import { StarknetHomepageNFT } from './types';
import starknetHomepageABI from '../abi/homepage.json'
import { deserializeTokenObject } from '../utils/deserializeTokenObject';

const CELL_MINT_PRICE = 0.01;
interface CellProps {
  row: number;
  col: number;
  isSelected: boolean;
  handleMouseDown: (row: number, col: number) => void;
  handleMouseEnter: (row: number, col: number) => void;
  nft: StarknetHomepageNFT | undefined;
}

interface MatrixState {
  isSelecting: boolean;
  startCell: { row: number; col: number };
  selectedCells: { row: number; col: number }[];
  showPopup: boolean;
  mintPrice: number | undefined;
  width: number;
  height: number;
}

const Cell: React.FC<CellProps> = ({ row, col, isSelected, handleMouseDown, handleMouseEnter, nft }) => {
  const isNftCell = !!nft;
  const handleCellClick = () => {
    if (isNftCell && nft?.link) {
      window.open(nft.link, '_blank'); // Open the link in a new tab
    }
  };
  return (
    <div
      style={{
        width: '10px',
        height: '10px',
        border: isNftCell ? 'none' : '1px solid black',
        boxSizing: 'border-box', 
        backgroundColor: isSelected ? '#0C0D4E' : isNftCell ? 'transparent' : '#f0f0f0',
        backgroundImage: isNftCell ? `url(${nft.img})` : 'none',
        backgroundSize: isNftCell ? `${nft.width * 10}px ${nft.height * 10}px` : 'auto',
        backgroundPosition: isNftCell ? `-${(col - nft.xpos) * 10}px -${(row - nft.ypos) * 10}px` : 'none',
        zIndex: isNftCell ? 1 : 0,
      }}
      onMouseDown={() => handleMouseDown(row, col)}
      onMouseEnter={() => handleMouseEnter(row, col)}
      onClick={handleCellClick}
    ></div>
  );
};




const Matrix: React.FC = () => {
  const totalRows = 100;
  const totalCols = 100;
  const [state, setState] = useState<MatrixState>({
    isSelecting: false,
    startCell: { row: 0, col: 0 },
    selectedCells: [],
    showPopup: false,
    mintPrice: undefined,
    width: 0,
    height: 0,
  });
  const [isApproveLoading, setIsApproveLoading] = useState(false);
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [newLink, setNewLink] = useState('');
  const [newImage, setNewImage] = useState('');

  const { isSelecting, startCell, selectedCells, mintPrice, showPopup, width, height } = state;

  const [allNfts, setAllNfts] = useState<StarknetHomepageNFT[]>([])

  const { data, isLoading } = useContractRead({
    address: STARKNET_HOMEPAGE_ERC721_ADDRESS,
    functionName: 'getAllTokens',
    abi: starknetHomepageABI,
    args: []
  });
  
  useEffect(() => {
    if (!isLoading) {
      const arr = data?.map((nft) => {
        return deserializeTokenObject(nft);
      });
      setAllNfts(arr || []);
    }
  }, [data, isLoading]);

  const mintCall = useMemo(() => {
    const splitNewImage: string[] = shortString.splitLongString(newImage);
    const splitNewLink: string[] = shortString.splitLongString(newLink);

    const tx = {
      contractAddress: STARKNET_HOMEPAGE_ERC721_ADDRESS,
      entrypoint: 'mint',
      calldata: [startCell.col, startCell.row, width, height, splitNewImage, splitNewLink]
    };
    return [tx];
  }, [startCell, newImage, newLink, width, height]);

  const approveCall = useMemo(() => {
    const price = selectedCells.length * 10000000000000000;

    const tx = {
      contractAddress: ERC_20_ADDRESS,
      entrypoint: 'approve',
      calldata: [STARKNET_HOMEPAGE_ERC721_ADDRESS, `${price}`, '0'],
    };
    return [tx];
  }, [mintPrice]);

  const { writeAsync: writeApprove } = useContractWrite({ calls: approveCall });

  const { writeAsync: writeMint } = useContractWrite({ calls: mintCall });

  const handleMouseDown = (row: number, col: number): void => {
    // Check if the clicked cell contains an NFT image
    const clickedCellHasNft = allNfts.some(
      (n) =>
        row >= n.ypos &&
        row < n.ypos + n.height &&
        col >= n.xpos &&
        col < n.xpos + n.width &&
        row - n.ypos < n.height &&
        col - n.xpos < n.width
    );
  
    if (!clickedCellHasNft) {
      setState((prevState) => ({
        ...prevState,
        isSelecting: true,
        startCell: { row, col },
        selectedCells: [{ row, col }],
      }));
    }
  };  
  
  const handleMouseUp = (): void => {
    if (isSelecting) {
      setState((prevState) => ({
        ...prevState,
        isSelecting: false,
        showPopup: selectedCells.length >= 1,
        mintPrice: selectedCells.length * CELL_MINT_PRICE
      }));
    }
  };

  const handleMouseEnter = (row: number, col: number): void => {
    if (isSelecting) {
      const newSelectedCells: any[] = [];
      const numRows = Math.abs(row - startCell.row) + 1;
      const numCols = Math.abs(col - startCell.col) + 1;
  
      for (let r = Math.min(startCell.row, row); r <= Math.max(startCell.row, row); r++) {
        for (let c = Math.min(startCell.col, col); c <= Math.max(startCell.col, col); c++) {
          newSelectedCells.push({ row: r, col: c });
        }
      }
  
      setState((prevState) => ({
        ...prevState,
        selectedCells: newSelectedCells,
        mintPrice: newSelectedCells.length * CELL_MINT_PRICE,
        width: numCols,
        height: numRows,
      }));
    }
  };

  const handleApproveClick = async (): Promise<void> => {
    setIsApproveLoading(true);

    try {
      await writeApprove();
      setIsApproved(true);
      setIsApproveLoading(false);
    } catch (error) {
      console.error('Error approving transaction:', error);
      setIsApproveLoading(false);
    }
  };

  const handleMintClick = async (): Promise<void> => {
    setIsMintLoading(true);

    try {
      await writeMint();
      setIsMintLoading(false);
      setState((prevState) => ({
        ...prevState,
        showPopup: false,
        selectedCells: [],
        mintPrice: undefined,
      }));
    } catch (error) {
      console.error('Error minting transaction:', error);
      setIsMintLoading(false);
    }
  };


  const handleClosePopup = (): void => {
    setState((prevState) => ({
      ...prevState,
      showPopup: false,
      selectedCells: [],
      mintPrice: undefined,
    }));
  };

  if(isLoading) {
    return <CircularProgress size={60} sx={{padding: 8}} />
  }

  return (
    <div style={{ width: 'auto', height: '100vh', cursor: 'cell', padding: 'inherit', display: 'inline' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalCols}, 10px)`,
          gridTemplateRows: `repeat(${totalRows}, 10px)`,
          justifyContent: 'center',
        }}
        onMouseUp={handleMouseUp}
      >
        {Array.from({ length: totalRows }).map((_, row) =>
          Array.from({ length: totalCols }).map((_, col) => {
            const nft = allNfts.find(
              (n) => {
                const evaluation =
                  row >= n.ypos &&
                  row < n.ypos + n.height &&
                  col >= n.xpos &&
                  col < n.xpos + n.width &&
                  row - n.ypos < n.height &&
                  col - n.xpos < n.width;
                return evaluation;
              }
            );
            const isSelected = selectedCells.some((cell) => cell.row === row && cell.col === col);
            return (
              <Cell
                key={`${row},${col}`}
                row={row}
                col={col}
                isSelected={isSelected}
                handleMouseDown={handleMouseDown}
                handleMouseEnter={handleMouseEnter}
                nft={nft}
              />
            );
          })
        )}


      </div>

      <Modal
      open={showPopup}
      onClose={handleClosePopup}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          p: 3,
        }}
      >
        <Typography variant="h5">Mint NFT</Typography>
        <Typography mt={1} mb={1}>
          Price: {mintPrice} ETH + fees for {selectedCells.length * 100} pixels
        </Typography>
        <Grid container justifyContent='space-around'>
        {isApproveLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Button onClick={handleApproveClick} disabled={isApproved}>Approve</Button>
        )}
        {isMintLoading ? (
          <CircularProgress size={24} />
        ) : (
          <Button onClick={handleMintClick} disabled={!isApproved}>
            Mint
          </Button>
        )}
        </Grid>
        <TextField
          label={'Link for token'}
          value={newLink}
          onChange={(e) => setNewLink(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!isApproved}
        />
        <TextField
          label={'Image for token'}
          value={newImage}
          onChange={(e) => setNewImage(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!isApproved}
        />
      </Box>
    </Modal>
    </div>
  );
};

export default Matrix;