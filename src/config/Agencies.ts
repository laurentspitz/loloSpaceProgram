export interface AgencyConfig {
    id: string;
    name: string;
    logoColor: string; // Background color for badge
    textColor: string; // Text color
}

export const Agencies: Record<string, AgencyConfig> = {
    nasa: { id: 'nasa', name: 'NASA', logoColor: '#0b3d91', textColor: '#ffffff' },
    okb1: { id: 'okb1', name: 'OKB-1', logoColor: '#cc0000', textColor: '#ffffff' },
    esa: { id: 'esa', name: 'ESA', logoColor: '#003299', textColor: '#ffffff' },
    cnsa: { id: 'cnsa', name: 'CNSA', logoColor: '#d21f1f', textColor: '#ffffff' },
    spacex: { id: 'spacex', name: 'SpaceX', logoColor: '#000000', textColor: '#ffffff' },
    lolo: { id: 'lolo', name: 'LOLO', logoColor: '#00aaff', textColor: '#ffffff' },
    mw: { id: 'mw', name: 'MW 18014', logoColor: '#333333', textColor: '#ffffff' }, // For V-2 / Karman line
    rsa: { id: 'rsa', name: 'Roscosmos', logoColor: '#d21f1f', textColor: '#ffffff' }, // Russian Space Agency
    jaxa: { id: 'jaxa', name: 'JAXA', logoColor: '#0055aa', textColor: '#ffffff' }, // Japan
    csa: { id: 'csa', name: 'CSA', logoColor: '#ff0000', textColor: '#ffffff' }, // Canada
    isro: { id: 'isro', name: 'ISRO', logoColor: '#ff9933', textColor: '#ffffff' }, // India
    usa: { id: 'usa', name: 'USA', logoColor: '#3c3b6e', textColor: '#ffffff' }, // Generic USA
    ussr: { id: 'ussr', name: 'USSR', logoColor: '#CD0000', textColor: '#ffffff' }, // Generic USSR
};
