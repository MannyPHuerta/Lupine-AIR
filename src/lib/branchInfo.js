// Branch contact information for invoices and display
export const BRANCH_INFO = {
  '01 McAllen': {
    name: 'Rental World Equipment – McAllen',
    address: '4900 N 10th St, McAllen, TX 78504',
    phone: '(956) 687-6200',
    email: 'mcallen@rentalworld.com',
    coords: [26.2034, -98.2300],
  },
  '02 Weslaco': {
    name: 'Rental World Equipment – Weslaco',
    address: '1800 E Business 83, Weslaco, TX 78596',
    phone: '(956) 968-3366',
    email: 'weslaco@rentalworld.com',
    coords: [26.1595, -97.9908],
  },
  '03 Harlingen': {
    name: 'Rental World Equipment – Harlingen',
    address: '3200 W Business 83, Harlingen, TX 78550',
    phone: '(956) 428-5581',
    email: 'harlingen@rentalworld.com',
    coords: [26.1906, -97.6961],
  },
  '05 Brownsville': {
    name: 'Rental World Equipment – Brownsville',
    address: '4255 International Blvd, Brownsville, TX 78521',
    phone: '(956) 546-4411',
    email: 'brownsville@rentalworld.com',
    coords: [25.9017, -97.4975],
  },
  '06 Corpus': {
    name: 'Rental World Equipment – Corpus Christi',
    address: '5410 Leopard St, Corpus Christi, TX 78408',
    phone: '(361) 289-6000',
    email: 'corpus@rentalworld.com',
    coords: [27.8006, -97.3964],
  },
  '98 Shop': {
    name: 'Rental World Equipment – Shop',
    address: 'Internal Shop Location',
    phone: '',
    email: '',
    coords: [26.2034, -98.2300],
  },
  '99 Warehouse': {
    name: 'Rental World Equipment – Warehouse',
    address: 'Internal Warehouse Location',
    phone: '',
    email: '',
    coords: [26.2034, -98.2300],
  },
};

export function getBranchInfo(branch) {
  return BRANCH_INFO[branch] || {
    name: 'Rental World Equipment',
    address: '',
    phone: '',
    email: '',
  };
}