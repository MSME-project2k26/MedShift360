export interface Ward {
  name: string;
  beds: number;
  type: string;
  image: string;
}

export interface Hospital {
  id: number;
  name: string;
  location: string;
  image: string;
  type: string;
  beds: number;
  rating: number;
  distance: number;
  departments: string[];
  wards: Ward[]; 
}
