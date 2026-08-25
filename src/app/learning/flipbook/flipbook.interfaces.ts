export type FlipbookBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'numberedList'; items: string[] }
  | { kind: 'callout'; title?: string; text: string; tone?: 'info' | 'warning' | 'success' }
  | { kind: 'definition'; term: string; definition: string }
  | { kind: 'tableSimple'; headers: string[]; rows: string[][] }
  | { kind: 'quote'; text: string; attribution?: string }
  | { kind: 'checklist'; items: string[] };

export interface CoverPage {
  type: 'cover';
  moduleLabel?: string;
  title: string;
  subtitle?: string;
  image?: string;
}

export interface ContentPage {
  type: 'content';
  title: string;
  blocks: FlipbookBlock[];
}

export interface BackCoverPage {
  type: 'back-cover';
  title: string;
  subtitle?: string;
  ctaPrimary?: { label: string; route?: string; href?: string };
  ctaSecondary?: { label: string; route?: string; href?: string };
}

export type FlipbookPage = CoverPage | ContentPage | BackCoverPage;

export interface Flipbook {
  id: string;
  moduleNumber?: number;
  title: string;
  subtitle?: string;
  coverImage?: string;
  draft?: boolean;
  pages: FlipbookPage[];
}

export interface Spread {
  index: number;        // spread index (0..total-1)
  left: FlipbookPage | null;
  right: FlipbookPage | null;
  leftPageNumber: number | null;  // 1-based, or null when blank
  rightPageNumber: number | null;
}
