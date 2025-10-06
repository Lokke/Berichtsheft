import { execSync } from 'child_process';

export async function GET() {
  try {
    // Prüfe ob pdflatex verfügbar ist
    try {
      execSync('pdflatex --version', { stdio: 'ignore' });
      return Response.json({ 
        status: 'healthy', 
        latex: 'available',
        timestamp: new Date().toISOString()
      });
    } catch {
      return Response.json({ 
        status: 'healthy', 
        latex: 'unavailable',
        timestamp: new Date().toISOString()
      });
    }
  } catch {
    return Response.json({ 
      status: 'error', 
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}