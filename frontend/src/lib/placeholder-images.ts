/**
 * Placeholder Images for HealthLink Pro
 * Using Unsplash for high-quality healthcare imagery
 */

export interface PlaceholderImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
}

export const PlaceHolderImages: PlaceholderImage[] = [
  {
    id: 'hero-healthcare',
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=800&fit=crop',
    alt: 'Modern healthcare facility',
    width: 1200,
    height: 800,
  },
  {
    id: 'doctor-patient',
    url: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&h=600&fit=crop',
    alt: 'Doctor consulting with patient',
    width: 800,
    height: 600,
  },
  {
    id: 'medical-technology',
    url: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&h=600&fit=crop',
    alt: 'Medical technology and innovation',
    width: 800,
    height: 600,
  },
  {
    id: 'health-records',
    url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop',
    alt: 'Digital health records',
    width: 800,
    height: 600,
  },
  {
    id: 'telemedicine',
    url: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop',
    alt: 'Telemedicine consultation',
    width: 800,
    height: 600,
  },
  {
    id: 'pharmacy',
    url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=600&fit=crop',
    alt: 'Modern pharmacy',
    width: 800,
    height: 600,
  },
  {
    id: 'lab-testing',
    url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=600&fit=crop',
    alt: 'Laboratory testing',
    width: 800,
    height: 600,
  },
  {
    id: 'healthcare-team',
    url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop',
    alt: 'Healthcare team collaboration',
    width: 800,
    height: 600,
  },
];
