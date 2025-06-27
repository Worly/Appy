export type TestService = {
    name: string;
    displayName: string;
    duration: string;
}

export let testServices: TestService[] = [
    {
        name: "Service0",
        displayName: "Service0",
        duration: "00:15",
    },
    {
        name: "Service1",
        displayName: "Service1",
        duration: "00:30",
    },
    {
        name: "Service2",
        displayName: "Service2",
        duration: "01:00",
    },
]

export function getTestService(name: string): TestService {
    const service = testServices.find(s => s.name === name);
    if (!service) {
        throw new Error(`Service with name ${name} not found`);
    }
    
    return service;
}