import React, { useState } from 'react';

interface CellProps {
  row: number;
  col: number;
  isSelected: boolean;
  handleMouseDown: (row: number, col: number) => void;
  handleMouseEnter: (row: number, col: number) => void;
}

interface MatrixState {
  isSelecting: boolean;
  startCell: { row: number; col: number };
  selectedCells: { row: number; col: number }[];
  showPopup: boolean;
  mintPrice: number;
}

const Cell: React.FC<CellProps> = ({ row, col, isSelected, handleMouseDown, handleMouseEnter }) => {
  return (
    <div
      style={{
        width: '10px',
        height: '10px',
        backgroundColor: isSelected ? 'yellow' : '#f0f0f0',
        border: '1px solid black',
      }}
      onMouseDown={() => handleMouseDown(row, col)}
      onMouseEnter={() => handleMouseEnter(row, col)}
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
    mintPrice: 0.0001,
  });

  const { isSelecting, startCell, selectedCells, showPopup, mintPrice } = state;

  const handleMouseDown = (row: number, col: number): void => {
    setState((prevState) => ({
      ...prevState,
      isSelecting: true,
      startCell: { row, col },
      selectedCells: [{ row, col }],
    }));
  };

  const handleMouseUp = (): void => {
    if (isSelecting) {
      setState((prevState) => ({
        ...prevState,
        isSelecting: false,
        showPopup: selectedCells.length >= 1,
      }));
    }
  };

  const handleMouseEnter = (row: number, col: number): void => {
    if (isSelecting) {
      const newSelectedCells: any[] = [];
      for (let r = Math.min(startCell.row, row); r <= Math.max(startCell.row, row); r++) {
        for (let c = Math.min(startCell.col, col); c <= Math.max(startCell.col, col); c++) {
          newSelectedCells.push({ row: r, col: c });
        }
      }
      setState((prevState) => ({
        ...prevState,
        selectedCells: newSelectedCells,
      }));
    }
  };

  const handleMintClick = (): void => {
    // Implement your minting logic here
    console.log('Mint NFT for selected cells');
    setState((prevState) => ({
      ...prevState,
      showPopup: false,
      selectedCells: [],
    }));
  };

  return (
    <div style={{ width: 'auto', height: '100vh', cursor: 'cell', padding: 'inherit' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalCols}, 10px)`,
          justifyContent: 'center',
        }}
        onMouseUp={handleMouseUp}
      >
        {Array.from({ length: totalRows }).map((_, row) =>
          Array.from({ length: totalCols }).map((_, col) => (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              isSelected={selectedCells.some((cell) => cell.row === row && cell.col === col)}
              handleMouseDown={handleMouseDown}
              handleMouseEnter={handleMouseEnter}
            />
          ))
        )}
      </div>

      {showPopup && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1,
          }}
        >
          <div
            style={{
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h2>Mint NFT</h2>
            <p>
              Price: {mintPrice.toFixed(5)} ETH for {selectedCells.length} cells
            </p>
            <button onClick={handleMintClick}>Mint</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matrix;
