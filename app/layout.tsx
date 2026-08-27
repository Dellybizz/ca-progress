import './globals.css';
import { ProgressProvider } from '@/context/ProgressContext';
export const metadata={title:'CA Progress',description:'CA Intermediate study tracker'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='en'><body><ProgressProvider>{children}</ProgressProvider></body></html>}
