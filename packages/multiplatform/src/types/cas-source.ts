import { Ready } from './ready';
import { KnownSourcesService } from '../known-sources/known-sources.service';

/**
 * A CASource (Content Addressable Storage Source) is a service that implements a standard function `get`,
 * which receives the hash of the object and returns it
 */
export interface CASSource extends Ready {
  casID: string;

  /**
   * If the service provider has a known source service associated, any object stored on it
   * can be linked to other sources
   */
  knownSources?: KnownSourcesService;

  /**
   * Get the object identified by the given hash,
   * or undefined if it didn't exist in the source
   *
   * @param hash the hash identifying the object
   * @returns the object if found, otherwise undefined
   */
  get(hash: string): Promise<object | undefined>;
}