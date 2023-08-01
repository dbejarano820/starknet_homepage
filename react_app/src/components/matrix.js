import React, { useState } from 'react';

const Cell = ({ row, col, isSelected, handleMouseDown, handleMouseEnter }) => {
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

const Matrix = () => {
  const totalRows = 100;
  const totalCols = 100;
  const [isSelecting, setIsSelecting] = useState(false);
  const [startCell, setStartCell] = useState({ row: 0, col: 0 });
  const [selectedCells, setSelectedCells] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [mintPrice, setMintPrice] = useState(0);

  const handleMouseDown = (row, col) => {
    setIsSelecting(true);
    setStartCell({ row, col });
    setSelectedCells([{ row, col }]);
  };

  const handleMouseUp = () => {
    if (isSelecting) {
      setIsSelecting(false);
      if (selectedCells.length >= 1) {
        const pricePerCell = 0.0001;
        const price = selectedCells.length * pricePerCell;
        setMintPrice(price);

        setShowPopup(true);
      } else {
        setShowPopup(false);
      }
    }
  };

  const handleMouseEnter = (row, col) => {
    if (isSelecting) {
      const newSelectedCells = [];
      for (let r = Math.min(startCell.row, row); r <= Math.max(startCell.row, row); r++) {
        for (let c = Math.min(startCell.col, col); c <= Math.max(startCell.col, col); c++) {
          newSelectedCells.push({ row: r, col: c });
        }
      }
      setSelectedCells(newSelectedCells);
    }
  };

  const handleMintClick = () => {
    // Implement your minting logic here
    console.log("Mint NFT for selected cells");
    setShowPopup(false);
    setSelectedCells([]);
  };

  return (
    <div style={{ width: '100%', height: '100vh', cursor: 'cell' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${totalCols}, 10px)`,
          gap: '1px',
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
