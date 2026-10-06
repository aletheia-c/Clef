import './style.css';
import {DirectoryView} from './directory_view';
import {HttpListingService} from './http_listing_service';
import type {ListingService} from './listing';

async function createListingService(): Promise<ListingService> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const {MockListingService} = await import('./mock_listing_service');
    return new MockListingService();
  }
  return new HttpListingService();
}

async function main(): Promise<void> {
  const service = await createListingService();
  const view = new DirectoryView(service, await service.mountPoint());
  view.start();
}

void main();
