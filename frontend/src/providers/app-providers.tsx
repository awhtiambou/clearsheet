"use client";

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  responsiveFontSizes,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useServerInsertedHTML } from "next/navigation";
import { useState, type ReactNode } from "react";

const baseTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5DADE2",
      dark: "#2C7CB6",
      contrastText: "#F7F9FB",
    },
    secondary: {
      main: "#2C3E50",
    },
    background: {
      default: "#F7F9FB",
      paper: "rgba(255, 255, 255, 0.9)",
    },
    text: {
      primary: "#2C3E50",
      secondary: "#617181",
    },
    divider: "rgba(189, 195, 199, 0.45)",
  },
  shape: {
    borderRadius: 22,
  },
  typography: {
    fontFamily: '"Work Sans", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
    },
    subtitle2: {
      fontFamily: '"Space Mono", monospace',
      letterSpacing: "0.12em",
      textTransform: "uppercase",
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: "#2C3E50",
          backgroundColor: "#F7F9FB",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 20,
          paddingBlock: 11,
          boxShadow: "none",
          "&.MuiButton-containedPrimary": {
            boxShadow: `0 16px 30px ${alpha("#5DADE2", 0.24)}`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 10,
        },
      },
    },
  },
});

const appTheme = responsiveFontSizes(baseTheme);

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "mui", prepend: true });
    cache.compat = true;

    const previousInsert = cache.insert;
    let inserted: string[] = [];

    cache.insert = (...args: Parameters<typeof previousInsert>) => {
      const serialized = args[1];

      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }

      return previousInsert(...args);
    };

    return {
      cache,
      flush: () => {
        const names = inserted;
        inserted = [];
        return names;
      },
    };
  });

  useServerInsertedHTML(() => {
    const names = flush();

    if (names.length === 0) {
      return null;
    }

    let styles = "";
    for (const name of names) {
      const style = cache.inserted[name];
      if (typeof style === "string") {
        styles += style;
      }
    }

    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
