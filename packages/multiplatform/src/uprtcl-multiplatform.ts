// Required by inversify
import 'reflect-metadata';

/** Services */
export { Authority } from './types/authority';
export { Ready } from './types/ready';
export { Source } from './types/source';

export { KnownSourcesService } from './services/known-sources.service';

export { DiscoveryService } from './services/discovery.service';

/** Utils */
export {
  linksFromObject,
  getUplToDiscover,
  discoverKnownSources,
  discoverLinksKnownSources
} from './services/discovery.utils';

/** Modules */
export { DiscoveryModule } from './discovery.module';
export { SourcesModule } from './sources.module';
