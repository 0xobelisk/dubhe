import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { DubheGrpcClient as ProtoDubheGrpcClient } from './proto/dubhe_grpc.client';

export class DubheGrpcClient {
  public dubheGrpcClient: ProtoDubheGrpcClient;
  constructor(options: GrpcWebOptions) {
    this.dubheGrpcClient = new ProtoDubheGrpcClient(new GrpcWebFetchTransport(options));
  }
}
