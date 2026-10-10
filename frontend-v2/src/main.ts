import './style.css';
import {DirectoryView} from './directory_view';
import {HttpListingService} from './http_listing_service';
import {HttpServerService} from './http_server_service';
import {HttpTagService} from './http_tag_service';
import type {ListingService} from './listing';
import type {ServerService} from './server';
import {StatusIndicator} from './status_indicator';
import {TagPanel} from './tag_panel';
import {TagRegistry} from './tag_registry';
import type {TagService} from './tags';

interface Services {
  listing: ListingService;
  tags: TagService;
  server: ServerService;
}

async function createServices(): Promise<Services> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const [{MockListingService}, {MockTagService}, {MockServerService}] =
      await Promise.all([
        import('./mock_listing_service'),
        import('./mock_tag_service'),
        import('./mock_server_service'),
      ]);
    return {
      listing: new MockListingService(),
      tags: new MockTagService(),
      server: new MockServerService(),
    };
  }
  return {
    listing: new HttpListingService(),
    tags: new HttpTagService(),
    server: new HttpServerService(),
  };
}

async function main(): Promise<void> {
  const {listing, tags, server} = await createServices();
  new StatusIndicator(server).start();

  const [rootPath, aliases] = await Promise.all([
    listing.mountPoint(),
    tags.registry().catch(() => undefined),
  ]);
  const panel = new TagPanel(tags, new TagRegistry(aliases));
  const view = new DirectoryView(listing, rootPath, files => panel.show(files));
  view.start();
}

void main();
