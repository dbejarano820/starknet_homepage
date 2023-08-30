import { InjectedConnector, StarknetConfig } from '@starknet-react/core'
import { Provider, constants } from 'starknet';
import type { AppProps } from 'next/app'
import { ThemeProvider } from "@mui/material";
import { theme } from "../utils/theme";
import createEmotionCache from "../utils/createEmotionCache";
import { CacheProvider, EmotionCache } from "@emotion/react";

const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}


export default function App({ Component, emotionCache = clientSideEmotionCache, pageProps }: MyAppProps) {
  const connectors = [
    new InjectedConnector({ options: { id: 'braavos' } }),
    new InjectedConnector({ options: { id: 'argentX' } }),
  ];

  const provider = new Provider({ sequencer: { network: constants.NetworkName.SN_GOERLI }});

  return (
    <StarknetConfig autoConnect defaultProvider={provider} connectors={connectors}>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <Component {...pageProps} />
        </ThemeProvider>
      </CacheProvider>
    </StarknetConfig>
  )
}
