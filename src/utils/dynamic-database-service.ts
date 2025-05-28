import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, createConnection } from 'mongoose';

@Injectable()
export class DynamicDatabaseService {
  private connections: { [key: string]: Connection } = {};

  constructor(private readonly configService: ConfigService) {}

  async connectToDatabase(dbName: string): Promise<Connection> {
    if (!this.connections[dbName]) {
      const uri = this.configService.get<string>('DB_URI');
      const connection = await createConnection(uri, {
        dbName: dbName,
      }).asPromise();

      this.connections[dbName] = connection;
    }
    return this.connections[dbName];
  }
}
