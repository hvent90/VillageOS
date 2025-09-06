// Database types and interfaces
export interface DatabaseConfig {
  url: string;
}

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
