import NextImage, { type ImageProps } from 'next/image';
import { isCatalogueCoverRoute } from '@/lib/public-asset-routes';

/** Catalogue authorization must not be bypassed by the shared image cache. */
export default function ArchiveImage(props: ImageProps) {
  return <NextImage {...props} unoptimized={props.unoptimized || (typeof props.src === 'string' && isCatalogueCoverRoute(props.src))} />;
}
