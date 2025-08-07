// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { DubheGrpcClient as ProtoDubheGrpcClient } from './proto/dubhe_grpc.client';
import type { RpcTransport } from '@protobuf-ts/runtime-rpc';
import { DubheGrpc } from './proto/dubhe_grpc';

export class DubheGrpcClient {
  public dubheGrpcClient: ProtoDubheGrpcClient;
  constructor(options: GrpcWebOptions) {
    this.dubheGrpcClient = new ProtoDubheGrpcClient(new GrpcWebFetchTransport(options));
  }
}
