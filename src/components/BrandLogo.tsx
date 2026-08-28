import { Link } from 'wouter';
import shineLogo from '../assets/shine-logo.png';

export function BrandLogo() {
  return <Link href="/" className="brand" aria-label="Shine — на главную"><img src={shineLogo} alt="Shine" /></Link>;
}
