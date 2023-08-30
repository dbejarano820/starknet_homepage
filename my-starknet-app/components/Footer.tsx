import React from 'react';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

const Footer = () => {
  return (
    <Grid container direction="column" alignItems="center" spacing={1} sx={{ mt: 3 }}>
      <Grid item>
        <Typography variant="body1">This project pays homage to the infamous <a href='http://www.milliondollarhomepage.com/'>Million Dollar Homepage.</a> </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body1" textAlign='center'>The images on this platform are not moderated and are presented in a true decentralized fashion, meaning there is no content filter. As a result, the responsibility for the images lies solely with the NFTs respective owners.</Typography>
      </Grid>
      <Grid item>
        <Typography variant="body2">
          Author: Daniel Bejarano |{' '}
          <Link href="https://github.com/dbejarano820" target="_blank" rel="noopener">
            GitHub
          </Link>{' '}
          |{' '}
          <Link href="https://twitter.com/0xBeja" target="_blank" rel="noopener">
            Twitter
          </Link>
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body2">
          Built with{' '}
          <Link href="https://mui.com/" target="_blank" rel="noopener">
            Material-UI
          </Link>{' '}
          and{' '}
          <Link href="https://github.com/apibara/starknet-react" target="_blank" rel="noopener">
            Starknet-React
          </Link>{' '}
          and powered by{' '}
          <Link href="https://www.starknet.io/" target="_blank" rel="noopener">
            Starknet
          </Link>
        </Typography>
      </Grid>
    </Grid>
  );
};

export default Footer;
