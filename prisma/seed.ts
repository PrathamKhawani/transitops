import { PrismaClient, Role, VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Seeding TransitOps database...');

  // Cleanup
  await prisma.activityLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Demo Users
  const password = await bcrypt.hash('demo1234', 12);
  const users = await prisma.user.createMany({
    data: [
      { name: 'Arjun Mehta', email: 'fleet@transitops.in', passwordHash: password, role: Role.FLEET_MANAGER },
      { name: 'Priya Sharma', email: 'dispatch@transitops.in', passwordHash: password, role: Role.DISPATCHER },
      { name: 'Rajesh Patel', email: 'safety@transitops.in', passwordHash: password, role: Role.SAFETY_OFFICER },
      { name: 'Kavya Desai', email: 'finance@transitops.in', passwordHash: password, role: Role.FINANCIAL_ANALYST },
    ],
  });
  console.log(`✅ Created ${users.count} users`);

  const dispatchUser = await prisma.user.findUnique({ where: { email: 'dispatch@transitops.in' } });

  // Vehicles
  const vehicleData = [
    { registrationNumber: 'GJ-01-AB-1234', name: 'Tata Prima 1', model: 'Tata Prima 4028.S', type: 'Heavy Truck', maximumLoadCapacity: 28, odometer: 48200, acquisitionCost: 3200000, region: 'Ahmedabad', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-01-CD-5678', name: 'Tata Prima 2', model: 'Tata Prima 3525', type: 'Heavy Truck', maximumLoadCapacity: 25, odometer: 62400, acquisitionCost: 2950000, region: 'Ahmedabad', status: VehicleStatus.ON_TRIP },
    { registrationNumber: 'GJ-05-EF-9012', name: 'Ashok Leyland 1', model: 'Ashok Leyland 2820', type: 'Heavy Truck', maximumLoadCapacity: 20, odometer: 91500, acquisitionCost: 2750000, region: 'Surat', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-05-GH-3456', name: 'Ashok Leyland 2', model: 'Ashok Leyland 3520', type: 'Heavy Truck', maximumLoadCapacity: 22, odometer: 34800, acquisitionCost: 2850000, region: 'Surat', status: VehicleStatus.IN_SHOP },
    { registrationNumber: 'GJ-06-IJ-7890', name: 'BharatBenz 1', model: 'BharatBenz 2523', type: 'Medium Truck', maximumLoadCapacity: 15, odometer: 27300, acquisitionCost: 2100000, region: 'Vadodara', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-06-KL-1234', name: 'BharatBenz 2', model: 'BharatBenz 1623', type: 'Medium Truck', maximumLoadCapacity: 12, odometer: 55700, acquisitionCost: 1950000, region: 'Vadodara', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-03-MN-5678', name: 'Eicher Pro 1', model: 'Eicher Pro 6025', type: 'Medium Truck', maximumLoadCapacity: 10, odometer: 78900, acquisitionCost: 1650000, region: 'Rajkot', status: VehicleStatus.ON_TRIP },
    { registrationNumber: 'GJ-03-OP-9012', name: 'Eicher Pro 2', model: 'Eicher Pro 6031', type: 'Medium Truck', maximumLoadCapacity: 14, odometer: 43200, acquisitionCost: 1780000, region: 'Rajkot', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-01-QR-3456', name: 'Mahindra Blazo 1', model: 'Mahindra Blazo X 35', type: 'Heavy Truck', maximumLoadCapacity: 18, odometer: 22100, acquisitionCost: 2400000, region: 'Ahmedabad', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-05-ST-7890', name: 'Mahindra Blazo 2', model: 'Mahindra Blazo X 28', type: 'Heavy Truck', maximumLoadCapacity: 16, odometer: 67800, acquisitionCost: 2250000, region: 'Surat', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-06-UV-1234', name: 'Force Traveller 1', model: 'Force Traveller 40', type: 'Mini Truck', maximumLoadCapacity: 3.5, odometer: 38400, acquisitionCost: 850000, region: 'Vadodara', status: VehicleStatus.RETIRED },
    { registrationNumber: 'GJ-03-WX-5678', name: 'Force Traveller 2', model: 'Force Traveller 3700', type: 'Mini Truck', maximumLoadCapacity: 2.8, odometer: 89200, acquisitionCost: 780000, region: 'Rajkot', status: VehicleStatus.AVAILABLE },
    { registrationNumber: 'GJ-01-YZ-9999', name: 'Tata Ace Van-05', model: 'Tata Ace Gold', type: 'Van', maximumLoadCapacity: 0.5, odometer: 12000, acquisitionCost: 450000, region: 'Ahmedabad', status: VehicleStatus.AVAILABLE },
  ];

  const createdVehicles = await Promise.all(vehicleData.map(v => prisma.vehicle.create({ data: v })));
  console.log(`✅ Created ${createdVehicles.length} vehicles`);

  // Drivers
  const today = new Date();
  const driverData = [
    { name: 'Ramesh Bhai Patel', licenseNumber: 'GJ0120190012345', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear() + 2, 5, 15), contactNumber: '9876543210', safetyScore: 95, status: DriverStatus.ON_TRIP },
    { name: 'Suresh Kumar Yadav', licenseNumber: 'GJ0520180034567', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear() - 1, 3, 20), contactNumber: '9876543211', safetyScore: 72, status: DriverStatus.SUSPENDED },
    { name: 'Mahesh Lal Verma', licenseNumber: 'GJ0620200056789', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear(), today.getMonth() + 1, 10), contactNumber: '9876543212', safetyScore: 88, status: DriverStatus.AVAILABLE },
    { name: 'Dinesh Bhai Shah', licenseNumber: 'GJ0320170078901', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear() + 1, 8, 25), contactNumber: '9876543213', safetyScore: 91, status: DriverStatus.ON_TRIP },
    { name: 'Nilesh Prajapati', licenseNumber: 'GJ0120210001234', licenseCategory: 'MMV', licenseExpiryDate: new Date(today.getFullYear() + 3, 1, 28), contactNumber: '9876543214', safetyScore: 97, status: DriverStatus.AVAILABLE },
    { name: 'Kamlesh Solanki', licenseNumber: 'GJ0520160023456', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear(), today.getMonth() + 3, 5), contactNumber: '9876543215', safetyScore: 83, status: DriverStatus.AVAILABLE },
    { name: 'Paresh Thakkar', licenseNumber: 'GJ0620220045678', licenseCategory: 'LMV', licenseExpiryDate: new Date(today.getFullYear() + 4, 7, 12), contactNumber: '9876543216', safetyScore: 99, status: DriverStatus.AVAILABLE },
    { name: 'Hitesh Bhai Modi', licenseNumber: 'GJ0320180067890', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear(), today.getMonth() + 2, 18), contactNumber: '9876543217', safetyScore: 79, status: DriverStatus.OFF_DUTY },
    { name: 'Jayesh Trivedi', licenseNumber: 'GJ0120190089012', licenseCategory: 'HMV', licenseExpiryDate: new Date(today.getFullYear() + 1, 11, 30), contactNumber: '9876543218', safetyScore: 93, status: DriverStatus.AVAILABLE },
    { name: 'Alpesh Chauhan', licenseNumber: 'GJ0520210011234', licenseCategory: 'MMV', licenseExpiryDate: new Date(today.getFullYear() + 2, 4, 8), contactNumber: '9876543219', safetyScore: 86, status: DriverStatus.AVAILABLE },
  ];

  const createdDrivers = await Promise.all(driverData.map(d => prisma.driver.create({ data: d })));
  console.log(`✅ Created ${createdDrivers.length} drivers`);

  // Trips
  const tripRoutes = [
    { source: 'Ahmedabad', destination: 'Surat', plannedDistance: 265 },
    { source: 'Surat', destination: 'Vadodara', plannedDistance: 155 },
    { source: 'Vadodara', destination: 'Rajkot', plannedDistance: 200 },
    { source: 'Rajkot', destination: 'Ahmedabad', plannedDistance: 220 },
    { source: 'Ahmedabad', destination: 'Vadodara', plannedDistance: 110 },
    { source: 'Surat', destination: 'Rajkot', plannedDistance: 310 },
  ];

  const tripsToCreate = [
    { tripCode: 'TRP-2024-001', ...tripRoutes[0], vehicleId: createdVehicles[0].id, driverId: createdDrivers[0].id, cargoWeight: 18, revenue: 45000, initialOdometer: 48000, finalOdometer: 48265, actualDistance: 268, fuelConsumed: 75, status: TripStatus.COMPLETED, dispatchedAt: new Date(Date.now() - 5 * 24 * 3600000), completedAt: new Date(Date.now() - 4 * 24 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-002', ...tripRoutes[1], vehicleId: createdVehicles[2].id, driverId: createdDrivers[3].id, cargoWeight: 14, revenue: 28000, initialOdometer: 91300, finalOdometer: 91455, actualDistance: 157, fuelConsumed: 44, status: TripStatus.COMPLETED, dispatchedAt: new Date(Date.now() - 3 * 24 * 3600000), completedAt: new Date(Date.now() - 2 * 24 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-003', ...tripRoutes[2], vehicleId: createdVehicles[4].id, driverId: createdDrivers[2].id, cargoWeight: 10, revenue: 32000, initialOdometer: 27100, finalOdometer: 27300, actualDistance: 202, fuelConsumed: 48, status: TripStatus.COMPLETED, dispatchedAt: new Date(Date.now() - 2 * 24 * 3600000), completedAt: new Date(Date.now() - 1 * 24 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-004', ...tripRoutes[3], vehicleId: createdVehicles[1].id, driverId: createdDrivers[0].id, cargoWeight: 20, revenue: 38000, initialOdometer: 62200, actualDistance: undefined, fuelConsumed: undefined, status: TripStatus.DISPATCHED, dispatchedAt: new Date(Date.now() - 6 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-005', ...tripRoutes[4], vehicleId: createdVehicles[6].id, driverId: createdDrivers[3].id, cargoWeight: 8, revenue: 18000, initialOdometer: 78700, actualDistance: undefined, fuelConsumed: undefined, status: TripStatus.DISPATCHED, dispatchedAt: new Date(Date.now() - 4 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-006', ...tripRoutes[5], vehicleId: createdVehicles[9].id, driverId: createdDrivers[4].id, cargoWeight: 12, revenue: 52000, initialOdometer: 67600, actualDistance: undefined, fuelConsumed: undefined, status: TripStatus.DRAFT, createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-007', ...tripRoutes[0], vehicleId: createdVehicles[7].id, driverId: createdDrivers[5].id, cargoWeight: 13, revenue: 41000, initialOdometer: 43000, actualDistance: undefined, fuelConsumed: undefined, status: TripStatus.DRAFT, createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-008', ...tripRoutes[1], vehicleId: createdVehicles[8].id, driverId: createdDrivers[8].id, cargoWeight: 16, revenue: 30000, initialOdometer: 22000, finalOdometer: 22155, actualDistance: 158, fuelConsumed: 40, status: TripStatus.COMPLETED, dispatchedAt: new Date(Date.now() - 7 * 24 * 3600000), completedAt: new Date(Date.now() - 6 * 24 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-009', ...tripRoutes[2], vehicleId: createdVehicles[5].id, driverId: createdDrivers[9].id, cargoWeight: 9, revenue: 24000, initialOdometer: 55600, finalOdometer: 55800, actualDistance: 203, fuelConsumed: 52, status: TripStatus.COMPLETED, dispatchedAt: new Date(Date.now() - 4 * 24 * 3600000), completedAt: new Date(Date.now() - 3 * 24 * 3600000), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-010', ...tripRoutes[3], vehicleId: createdVehicles[11].id, driverId: createdDrivers[6].id, cargoWeight: 2, revenue: 12000, initialOdometer: 89000, finalOdometer: 89220, actualDistance: 222, fuelConsumed: 38, status: TripStatus.COMPLETED, dispatchedAt: new Date(Date.now() - 1 * 24 * 3600000), completedAt: new Date(), createdBy: dispatchUser!.id },
    { tripCode: 'TRP-2024-011', ...tripRoutes[5], vehicleId: createdVehicles[0].id, driverId: createdDrivers[8].id, cargoWeight: 22, revenue: 65000, initialOdometer: 48265, actualDistance: undefined, fuelConsumed: undefined, status: TripStatus.CANCELLED, createdBy: dispatchUser!.id },
  ];

  const createdTrips = await Promise.all(tripsToCreate.map(t => prisma.trip.create({ data: t })));
  console.log(`✅ Created ${createdTrips.length} trips`);

  // Maintenance Logs
  await prisma.maintenanceLog.createMany({
    data: [
      { vehicleId: createdVehicles[3].id, type: 'Repair', description: 'Engine overhaul and fuel injector replacement', cost: 85000, startDate: new Date(Date.now() - 3 * 24 * 3600000), status: MaintenanceStatus.IN_PROGRESS },
      { vehicleId: createdVehicles[0].id, type: 'Scheduled Service', description: '50,000 km service - oil, filters, brake pads', cost: 18000, startDate: new Date(Date.now() - 10 * 24 * 3600000), completedDate: new Date(Date.now() - 8 * 24 * 3600000), status: MaintenanceStatus.COMPLETED },
      { vehicleId: createdVehicles[2].id, type: 'Tyre Replacement', description: 'Replace all 6 tyres - worn beyond limit', cost: 42000, startDate: new Date(Date.now() - 15 * 24 * 3600000), completedDate: new Date(Date.now() - 14 * 24 * 3600000), status: MaintenanceStatus.COMPLETED },
      { vehicleId: createdVehicles[4].id, type: 'Scheduled Service', description: '30,000 km service - routine maintenance', cost: 12000, startDate: new Date(Date.now() + 5 * 24 * 3600000), status: MaintenanceStatus.SCHEDULED },
      { vehicleId: createdVehicles[6].id, type: 'Electrical Repair', description: 'Dashboard wiring and sensors', cost: 22000, startDate: new Date(Date.now() - 20 * 24 * 3600000), completedDate: new Date(Date.now() - 18 * 24 * 3600000), status: MaintenanceStatus.COMPLETED },
    ],
  });

  // Fuel Logs
  await prisma.fuelLog.createMany({
    data: [
      { vehicleId: createdVehicles[0].id, tripId: createdTrips[0].id, liters: 75, cost: 7275, date: new Date(Date.now() - 4 * 24 * 3600000), odometerReading: 48265 },
      { vehicleId: createdVehicles[2].id, tripId: createdTrips[1].id, liters: 44, cost: 4268, date: new Date(Date.now() - 2 * 24 * 3600000), odometerReading: 91455 },
      { vehicleId: createdVehicles[4].id, tripId: createdTrips[2].id, liters: 48, cost: 4656, date: new Date(Date.now() - 1 * 24 * 3600000), odometerReading: 27300 },
      { vehicleId: createdVehicles[7].id, tripId: createdTrips[7].id, liters: 40, cost: 3880, date: new Date(Date.now() - 6 * 24 * 3600000), odometerReading: 22155 },
      { vehicleId: createdVehicles[5].id, tripId: createdTrips[8].id, liters: 52, cost: 5044, date: new Date(Date.now() - 3 * 24 * 3600000), odometerReading: 55800 },
      { vehicleId: createdVehicles[11].id, tripId: createdTrips[9].id, liters: 38, cost: 3686, date: new Date(), odometerReading: 89220 },
      { vehicleId: createdVehicles[1].id, liters: 60, cost: 5820, date: new Date(Date.now() - 8 * 24 * 3600000), odometerReading: 62100 },
    ],
  });

  // Expenses
  await prisma.expense.createMany({
    data: [
      { vehicleId: createdVehicles[3].id, type: 'Maintenance', description: 'Engine overhaul', amount: 85000, date: new Date(Date.now() - 3 * 24 * 3600000) },
      { vehicleId: createdVehicles[0].id, type: 'Maintenance', description: '50k km service', amount: 18000, date: new Date(Date.now() - 8 * 24 * 3600000) },
      { vehicleId: createdVehicles[2].id, type: 'Maintenance', description: 'Tyre replacement', amount: 42000, date: new Date(Date.now() - 14 * 24 * 3600000) },
      { tripId: createdTrips[0].id, type: 'Toll', description: 'Ahmedabad-Surat highway toll', amount: 1800, date: new Date(Date.now() - 4 * 24 * 3600000) },
      { tripId: createdTrips[1].id, type: 'Toll', description: 'Surat-Vadodara highway toll', amount: 950, date: new Date(Date.now() - 2 * 24 * 3600000) },
      { tripId: createdTrips[2].id, type: 'Labour', description: 'Loading/unloading charges', amount: 3500, date: new Date(Date.now() - 1 * 24 * 3600000) },
      { vehicleId: createdVehicles[6].id, type: 'Maintenance', description: 'Electrical repair', amount: 22000, date: new Date(Date.now() - 18 * 24 * 3600000) },
      { tripId: createdTrips[7].id, type: 'Toll', description: 'Surat-Vadodara toll', amount: 950, date: new Date(Date.now() - 6 * 24 * 3600000) },
      { type: 'Admin', description: 'Insurance renewal - 3 vehicles', amount: 125000, date: new Date(Date.now() - 12 * 24 * 3600000) },
      { type: 'Admin', description: 'Driver training program', amount: 45000, date: new Date(Date.now() - 20 * 24 * 3600000) },
    ],
  });

  console.log('✅ Fuel logs and expenses created');
  console.log('\n🎉 TransitOps seed complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  fleet@transitops.in    / demo1234  (Fleet Manager)');
  console.log('  dispatch@transitops.in / demo1234  (Dispatcher)');
  console.log('  safety@transitops.in   / demo1234  (Safety Officer)');
  console.log('  finance@transitops.in  / demo1234  (Financial Analyst)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
