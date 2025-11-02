import type { GrpcWebOptions } from '@protobuf-ts/grpcweb-transport';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';
import { DubheGrpcClient as ProtoDubheGrpcClient } from './proto/dubhe_grpc.client';

export class DubheGrpcClient {
  public dubheGrpcClient: ProtoDubheGrpcClient;
  private currentOptions: GrpcWebOptions;

  constructor(options: GrpcWebOptions) {
    this.currentOptions = options;
    this.dubheGrpcClient = new ProtoDubheGrpcClient(new GrpcWebFetchTransport(options));
  }

  /**
   * Update gRPC configuration dynamically
   * @param options - Partial configuration to update (same type as constructor)
   */
  updateConfig(options: Partial<GrpcWebOptions>) {
    // Merge with current options
    this.currentOptions = {
      ...this.currentOptions,
      ...options
    };

    // Recreate transport and client with new options
    this.dubheGrpcClient = new ProtoDubheGrpcClient(new GrpcWebFetchTransport(this.currentOptions));
  }
}
