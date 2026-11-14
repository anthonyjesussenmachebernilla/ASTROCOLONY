import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IntroPage from '@/app/intro/page';

describe('prólogo de Aurora-1', () => {
  it('conecta la historia de López con la entrada a la colonia', () => {
    render(<IntroPage />);
    expect(screen.getByRole('heading', { name: 'Conoce Aurora-1' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'e' });
    expect(screen.getByRole('heading', { name: 'Revisa el suministro' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Inspeccionar panel/i })[0]);
    expect(screen.getByRole('heading', { name: 'Prepara la colonia' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'e' });
    expect(screen.getByRole('link', { name: /Entrar a la colonia/i })).toHaveAttribute('href', '/game');
  });
});
