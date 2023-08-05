import Image from 'next/image';
import { useAccount, useConnectors } from '@starknet-react/core'
import { useMemo, useState } from 'react'
import { DialogTitle, DialogContentText, DialogContent, DialogActions, Dialog, Button, Box, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles'
import { styled } from '@mui/material/styles';

const StyledButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
  },
}));

const ConnectWalletButton = styled(Button)(({ theme }) => ({
  border: "1px solid",
  width: "-webkit-fill-available",
  display: "flex",
  justifyContent: "space-between"
}));

const StyledBox = styled(Box)(({ theme }) => ({
  marginLeft: 'auto',
}));


function WalletConnected({ address } : { address: string }) {
  const { disconnect } = useConnectors()

  const shortenedAddress = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  return (
    <StyledBox>
      <StyledButton color="inherit" onClick={disconnect}>
        {shortenedAddress}
      </StyledButton>
      <span>Connected to Mainnet</span>
    </StyledBox>
  )
}

function ConnectWallet() {
  const { connectors, connect } = useConnectors()
  const [open, setOpen] = useState(false)
  const theme = useTheme()

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <StyledBox>
      <StyledButton color="inherit" onClick={handleClickOpen}>
        Connect Wallet
      </StyledButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Connect to a wallet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <Grid container direction="column" alignItems="flex-start" gap={1}>
              {connectors.map((connector) => (
                <ConnectWalletButton
                  key={connector.id}
                  onClick={() => {
                    connect(connector)
                    handleClose()
                  }}
                  sx={{ margin: theme.spacing(1) }}
                >
                  {connector.id}
                  <Image src={`/${connector.id}-icon.png`} alt={connector.id} width={30} height={30} />
                </ConnectWalletButton>
              ))}
            </Grid>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </StyledBox>
  )
}

export default function WalletBar() {
  const { address } = useAccount()

  return address ? <WalletConnected address={address} /> : <ConnectWallet />
}
