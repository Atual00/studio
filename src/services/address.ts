/**
 * Represents an address with street, number, complement, neighborhood, city, and postal code.
 */
export interface Address {
  /**
   * The street address.
   */
  street: string;
  /**
   * The number of the building.
   */
  number: string;
  /**
   * Additional address information (e.g., apartment number).
   */
  complement?: string;
  /**
   * The neighborhood.
   */
  neighborhood: string;
  /**
   * The city.
   */
  city: string;
  /**
   * The postal code.
   */
  postalCode: string;
}

/**
 * Asynchronously retrieves address information based on a postal code.
 *
 * @param postalCode The postal code to search for.
 * @returns A promise that resolves to an Address object.
 */
export async function getAddressByPostalCode(postalCode: string): Promise<Address | null> {
  // TODO: Implement this by calling an API.
  return {
    street: 'Rua Teste',
    number: '123',
    complement: 'Apto 456',
    neighborhood: 'Centro',
    city: 'São Paulo',
    postalCode: '01000-000',
  };
}
