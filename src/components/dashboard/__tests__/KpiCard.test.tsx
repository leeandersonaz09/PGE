import { render, screen } from '@testing-library/react';
import { KpiCard } from '../KpiCard';

describe('KpiCard Component', () => {
  it('deve renderizar o label e o valor corretamente', () => {
    // Renderiza o componente isoladamente
    render(<KpiCard label="Total Alunos" value={1500} color="text-blue-600" />);
    
    // Verifica se os textos passados via props estão presentes em tela
    expect(screen.getByText('Total Alunos')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
  });
});
