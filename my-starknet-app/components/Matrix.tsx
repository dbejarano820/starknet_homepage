import React, { useState, useMemo, useEffect, useCallback } from "react";
import _ from "lodash";
import { useContractWrite, useContractRead } from "@starknet-react/core";
import { shortString } from "starknet";
import {
  CircularProgress,
  TextField,
  Grid,
  Typography,
  Box,
  Modal,
  Button,
  Tooltip,
} from "@mui/material";
import { ERC_20_ADDRESS, STARKNET_HOMEPAGE_ERC721_ADDRESS } from "../constants";
import { StarknetHomepageNFT } from "./types";
import starknetHomepageABI from "../abi/homepage.json";
import { deserializeTokenObject } from "../utils/deserializeTokenObject";

const CELL_MINT_PRICE = 0.001;
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

const Cell: React.FC<CellProps> = ({
  row,
  col,
  isSelected,
  handleMouseDown,
  handleMouseEnter,
  nft,
}) => {
  const isNftCell = !!nft;
  const handleCellClick = () => {
    if (isNftCell && nft?.link) {
      window.open(nft.link, "_blank"); // Open the link in a new tab
    }
  };

  const cellContent = (
    <div
      style={{
        width: "10px",
        height: "10px",
        border: isNftCell ? "none" : "1px solid black",
        boxSizing: "border-box",
        backgroundColor: isSelected
          ? "#0C0D4E"
          : isNftCell
          ? "transparent"
          : "#f0f0f0",
        backgroundImage: isNftCell ? `url(${nft.img})` : "none",
        backgroundSize: isNftCell
          ? `${nft.width * 10}px ${nft.height * 10}px`
          : "auto",
        backgroundPosition: isNftCell
          ? `-${(col - nft.xpos) * 10}px -${(row - nft.ypos) * 10}px`
          : "none",
        zIndex: isNftCell ? 1 : 0,
        cursor: isNftCell ? "pointer" : "crosshair",
      }}
      onMouseDown={() => handleMouseDown(row, col)}
      onMouseEnter={() => handleMouseEnter(row, col)}
      onClick={handleCellClick}
      //  title={nft.title} once this is added
    ></div>
  );

  return !isNftCell ? (
    cellContent
  ) : (
    <Tooltip title={nft?.link}>{cellContent}</Tooltip>
  );
};

const MemoizedCell = React.memo(Cell);

const Matrix: React.FC = () => {
  const totalRows = 100;
  const totalCols = 100;
  const [state, setState] = useState<MatrixState>({
    isSelecting: false,
    startCell: { row: 0, col: 0 },
    selectedCells: [],
    showPopup: false,
    mintPrice: undefined,
    width: 1,
    height: 1,
  });
  const [isMintLoading, setIsMintLoading] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [newImage, setNewImage] = useState("");

  const {
    isSelecting,
    startCell,
    selectedCells,
    mintPrice,
    showPopup,
    width,
    height,
  } = state;

  const [allNfts, setAllNfts] = useState<any[]>([]);

  const { data, isLoading } = useContractRead({
    address: STARKNET_HOMEPAGE_ERC721_ADDRESS,
    functionName: "getAllTokens",
    abi: starknetHomepageABI,
    args: [],
  });

  useEffect(() => {
    if (!isLoading) {
      const arr = data?.map((nft) => {
        return deserializeTokenObject(nft);
      });
      setAllNfts(arr || []);
    }
  }, [data, isLoading]);

  const calls = useMemo(() => {
    const splitNewImage: string[] = shortString.splitLongString(newImage);
    const splitNewLink: string[] = shortString.splitLongString(newLink);

    const tx2 = {
      contractAddress: STARKNET_HOMEPAGE_ERC721_ADDRESS,
      entrypoint: "mint",
      calldata: [
        startCell.col,
        startCell.row,
        width,
        height,
        splitNewImage,
        splitNewLink,
      ],
    };

    const price = selectedCells.length * 1000000000000000;

    const tx1 = {
      contractAddress: ERC_20_ADDRESS,
      entrypoint: "approve",
      calldata: [STARKNET_HOMEPAGE_ERC721_ADDRESS, `${price}`, "0"],
    };
    return [tx1, tx2];
  }, [startCell, newImage, newLink, width, height, selectedCells.length]);

  const { writeAsync: writeMulti } = useContractWrite({ calls });

  const nftFlags = useMemo(() => {
    const flags = Array.from({ length: totalRows }, () =>
      Array(totalCols).fill(false),
    );

    allNfts.forEach((nft) => {
      const xpos = parseInt(nft.xpos, 10);
      const ypos = parseInt(nft.ypos, 10);
      const width = parseInt(nft.width, 10);
      const height = parseInt(nft.height, 10);

      for (let r = ypos; r < ypos + height; r++) {
        for (let c = xpos; c < xpos + width; c++) {
          if (r < totalRows && c < totalCols) {
            flags[r][c] = true;
          } else {
            console.log(`Index out of bounds: ${r}, ${c}`);
          }
        }
      }
    });

    return flags;
  }, [allNfts, isLoading]);

  const handleMouseDown = useCallback(
    (row: number, col: number) => {
      // Check if the clicked cell contains an NFT image
      if (!nftFlags[row][col]) {
        setState((prevState) => ({
          ...prevState,
          isSelecting: true,
          startCell: { row, col },
          selectedCells: [{ row, col }],
        }));
      }
    },
    [nftFlags],
  );

  const handleMouseUp = useCallback(() => {
    // Check if any selected cell already has an NFT
    const isOverlappingWithNFT = selectedCells.some(
      (cell) => nftFlags[cell.row][cell.col],
    );

    if (isOverlappingWithNFT) {
      alert(
        "One or more selected cells already have an NFT associated with them. Please select a different area.",
      );
      setState((prevState) => ({
        ...prevState,
        isSelecting: false,
        showPopup: false,
        selectedCells: [],
      }));
      return;
    }

    if (isSelecting) {
      setState((prevState) => ({
        ...prevState,
        isSelecting: false,
        showPopup: selectedCells.length >= 1,
        mintPrice: selectedCells.length * CELL_MINT_PRICE,
      }));
    }
  }, [selectedCells, isSelecting, nftFlags]);

  const handleMouseEnter = useCallback(
    (row: number, col: number) => {
      if (isSelecting) {
        const newSelectedCells: any[] = [];
        const numRows = Math.abs(row - startCell.row) + 1;
        const numCols = Math.abs(col - startCell.col) + 1;

        for (
          let r = Math.min(startCell.row, row);
          r <= Math.max(startCell.row, row);
          r++
        ) {
          for (
            let c = Math.min(startCell.col, col);
            c <= Math.max(startCell.col, col);
            c++
          ) {
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
    },
    [isSelecting, startCell],
  );

  // Throttling handleMouseEnter using lodash
  const handleMouseEnterThrottled = useCallback(
    _.throttle(handleMouseEnter, 20),
    [handleMouseEnter],
  );

  const handleMintClick = async (): Promise<void> => {
    setIsMintLoading(true);
    try {
      await writeMulti();
      setIsMintLoading(false);
      setState((prevState) => ({
        ...prevState,
        showPopup: false,
        selectedCells: [],
        mintPrice: undefined,
      }));
    } catch (error) {
      console.error("Error approving transaction:", error);
    }
  };

  const handleClosePopup = (): void => {
    setIsMintLoading(false);
    setState((prevState) => ({
      ...prevState,
      showPopup: false,
      selectedCells: [],
      mintPrice: undefined,
    }));
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={60} sx={{ padding: 8 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "auto",
        height: "100vh",
        cursor: "cell",
        padding: "inherit",
        display: "inline",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${totalCols}, 10px)`,
          gridTemplateRows: `repeat(${totalRows}, 10px)`,
          justifyContent: "center",
        }}
        onMouseUp={handleMouseUp}
      >
        {Array.from({ length: totalRows }).map((_, row) =>
          Array.from({ length: totalCols }).map((_, col) => {
            const nft = allNfts.find((n) => {
              const evaluation =
                row >= n.ypos &&
                row < n.ypos + n.height &&
                col >= n.xpos &&
                col < n.xpos + n.width &&
                row - n.ypos < n.height &&
                col - n.xpos < n.width;
              return evaluation;
            });
            const isSelected = selectedCells.some(
              (cell) => cell.row === row && cell.col === col,
            );
            const isNftCell = nftFlags[row][col];
            return (
              <MemoizedCell
                key={`${row},${col}`}
                row={row}
                col={col}
                isSelected={isSelected}
                handleMouseDown={handleMouseDown}
                handleMouseEnter={handleMouseEnterThrottled}
                nft={isNftCell ? nft : undefined}
              />
            );
          }),
        )}
      </div>

      <Modal
        open={showPopup}
        onClose={handleClosePopup}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            bgcolor: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
            p: 3,
          }}
        >
          <Typography variant="h5">Mint NFT</Typography>
          <Typography mt={1} mb={1}>
            Price: {mintPrice} ETH + fees for {selectedCells.length * 100}{" "}
            pixels
          </Typography>
          <Grid container justifyContent="space-around">
            {isMintLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Button onClick={handleMintClick}>Mint</Button>
            )}
          </Grid>
          <TextField
            label={"Link for token"}
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label={"Image for token"}
            value={newImage}
            onChange={(e) => setNewImage(e.target.value)}
            fullWidth
            margin="normal"
          />
        </Box>
      </Modal>
    </div>
  );
};

export default Matrix;
