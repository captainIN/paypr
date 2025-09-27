'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/apollo-client';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function GraphApolloProvider({ children }: Props) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}