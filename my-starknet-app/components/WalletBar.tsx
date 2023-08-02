import { useAccount, useConnectors } from '@starknet-react/core'
import { useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { useTheme } from '@mui/material/styles'

function WalletConnected({ address } : { address: string }) {
  const { disconnect } = useConnectors()

  const shortenedAddress = useMemo(() => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address])

  return (
    <div>
      <Button color="inherit" onClick={disconnect}>
        {shortenedAddress}
      </Button>
      <span>Connected to Mainnet</span>
    </div>
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
    <div>
      <Button color="inherit" onClick={handleClickOpen}>
        Connect Wallet
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Choose a wallet:</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                onClick={() => {
                  connect(connector)
                  handleClose()
                }}
                sx={{ margin: theme.spacing(1) }}
              >
                {connector.id}
              </Button>
            ))}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default function WalletBar() {
  const { address } = useAccount()

  return address ? <WalletConnected address={address} /> : <ConnectWallet />
}
