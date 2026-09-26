/** A service in the catalog, with the price rooms charge unless they set their own. */
export interface IService {
  id: string;
  name: string;
  standardPrice: number;
}

/** A service to add, or the new details of an existing one. */
export interface IServiceRequest {
  name: string;
  standardPrice: number;
}
